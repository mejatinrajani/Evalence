"""
Import Service - Handle CSV/XLSX import for participants and teams
"""
import csv
import io
import json
import re
import logging
from typing import Dict, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
import pandas as pd
from models import Team, User, Project

logger = logging.getLogger(__name__)


class ImportError:
    def __init__(self, row: int, field: str, value: str, error: str):
        self.row = row
        self.field = field
        self.value = value
        self.error = error

    def to_dict(self):
        return {
            "row": self.row,
            "field": self.field,
            "value": self.value,
            "error": self.error,
            "action": "Fix and re-upload row"
        }


class ParticipantImporter:
    """Handle CSV/XLSX import for participants and teams"""

    REQUIRED_FIELDS = [
        'team_name',
        'participant_1_name', 'participant_1_email', 'participant_1_phone',
        'participant_2_name', 'participant_2_email', 'participant_2_phone',
        'participant_3_name', 'participant_3_email', 'participant_3_phone',
        'participant_4_name', 'participant_4_email', 'participant_4_phone',
        'participant_5_name', 'participant_5_email', 'participant_5_phone',
        'problem_statement'
    ]

    EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    PHONE_REGEX = r'^\+?1?\d{9,}$'

    @staticmethod
    def parse_file(file_content: bytes, filename: str) -> Tuple[List[Dict], List[ImportError]]:
        """Parse CSV or XLSX file and return rows"""
        errors = []
        rows = []

        try:
            if filename.endswith('.csv'):
                rows, errors = ParticipantImporter._parse_csv(file_content)
            elif filename.endswith(('.xlsx', '.xls')):
                rows, errors = ParticipantImporter._parse_excel(file_content)
            else:
                raise ValueError("File must be CSV or XLSX")

            return rows, errors

        except Exception as e:
            logger.error(f"File parsing error: {str(e)}")
            raise ValueError(f"Failed to parse file: {str(e)}")

    @staticmethod
    def _parse_csv(file_content: bytes) -> Tuple[List[Dict], List[ImportError]]:
        """Parse CSV file"""
        rows = []
        errors = []

        try:
            text_content = file_content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(text_content))

            for row_num, row in enumerate(reader, start=2):  # start=2 because header is row 1
                rows.append(row)

            return rows, errors

        except UnicodeDecodeError:
            raise ValueError("File must be UTF-8 encoded")

    @staticmethod
    def _parse_excel(file_content: bytes) -> Tuple[List[Dict], List[ImportError]]:
        """Parse XLSX file"""
        rows = []

        try:
            df = pd.read_excel(io.BytesIO(file_content))

            for _, row in df.iterrows():
                row_dict = row.to_dict()
                rows.append(row_dict)

            return rows, []

        except Exception as e:
            logger.error(f"Excel parsing error: {str(e)}")
            raise ValueError(f"Failed to parse Excel: {str(e)}")

    @staticmethod
    def validate_row(row: Dict, row_num: int) -> Tuple[bool, List[ImportError]]:
        """Validate single row"""
        errors = []

        # Check team name
        team_name = str(row.get('team_name', ')).strip()
        if not team_name or len(team_name) > 100:
            errors.append(ImportError(
                row_num, 'team_name', team_name,
                'Team name required and must be < 100 chars'
            ))

        # Check problem statement
        ps = str(row.get('problem_statement', '')).strip()
        if not ps or len(ps) > 1000:
            errors.append(ImportError(
                row_num, 'problem_statement', ps[:50],
                'Problem statement required and must be < 1000 chars'
            ))

        # Check participants (at least 1, max 5)
        valid_participants = 0
        for i in range(1, 6):
            name_field = f'participant_{i}_name'
            email_field = f'participant_{i}_email'
            phone_field = f'participant_{i}_phone'

            name = str(row.get(name_field, '')).strip()
            email = str(row.get(email_field, '')).strip()
            phone = str(row.get(phone_field, '')).strip()

            # If any field present, all required
            if name or email or phone:
                if not name:
                    errors.append(ImportError(
                        row_num, name_field, '',
                        f'Participant {i} name required'
                    ))

                if not email or not re.match(ParticipantImporter.EMAIL_REGEX, email):
                    errors.append(ImportError(
                        row_num, email_field, email,
                        f'Participant {i} email invalid'
                    ))

                phone_clean = phone.replace(' ', '').replace('-', '')
                if not phone or not re.match(ParticipantImporter.PHONE_REGEX, phone_clean):
                    errors.append(ImportError(
                        row_num, phone_field, phone,
                        f'Participant {i} phone invalid (10+ digits)'
                    ))

                valid_participants += 1

        if valid_participants == 0:
            errors.append(ImportError(
                row_num, 'participants', '',
                'At least 1 participant required'
            ))

        return len(errors) == 0, errors

    @staticmethod
    def import_participants(
        db: Session,
        rows: List[Dict],
        hackathon_id: int,
        organizer_id: int
    ) -> Dict:
        """Import all rows into database"""

        teams_created = 0
        participants_created = 0
        errors = []
        warnings = []
        existing_teams = set()
        existing_emails = set()

        # Fetch existing data
        existing = db.query(Team.name).filter(Team.hackathon_id == hackathon_id).all()
        existing_teams = {t.name.lower() for t in existing}

        existing_emails_db = db.query(User.email).all()
        existing_emails = {e.email.lower() for e in existing_emails_db}

        try:
            for row_num, row in enumerate(rows, start=2):
                # Validate row
                is_valid, row_errors = ParticipantImporter.validate_row(row, row_num)

                if row_errors:
                    errors.extend([e.to_dict() for e in row_errors])
                    if not is_valid:  # Validation errors - skip
                        continue

                # Check duplicate team
                team_name = str(row.get('team_name', '')).strip()
                if team_name.lower() in existing_teams:
                    errors.append({
                        "row": row_num,
                        "field": "team_name",
                        "error": f"Team '{team_name}' already exists",
                        "action": "Use different team name"
                    })
                    continue

                # Create team
                team = Team(
                    name=team_name,
                    hackathon_id=hackathon_id,
                    members=[]
                )
                db.add(team)
                db.flush()  # Get team ID

                teams_created += 1
                existing_teams.add(team_name.lower())

                # Create participants
                team_members = []
                for i in range(1, 6):
                    name = str(row.get(f'participant_{i}_name', '')).strip()
                    if not name:
                        continue

                    email = str(row.get(f'participant_{i}_email', '')).strip()
                    phone = str(row.get(f'participant_{i}_phone', '')).strip()

                    # Check email duplicate
                    if email.lower() in existing_emails:
                        warnings.append({
                            "row": row_num,
                            "message": f"Email {email} already exists, skipping participant {name}"
                        })
                        continue

                    # Create user
                    user = User(
                        email=email,
                        full_name=name,
                        hashed_password="",  # Password to be set separately
                        role="participant",
                    )
                    db.add(user)
                    db.flush()

                    team_members.append({
                        "user_id": user.id,
                        "name": name,
                        "email": email,
                        "phone": phone
                    })

                    participants_created += 1
                    existing_emails.add(email.lower())

                # Update team members
                team.members = team_members

                # Create project
                project = Project(
                    team_id=team.id,
                    title=f"{team_name} Project",
                    description=str(row.get('problem_statement', '')),
                    hackathon_id=hackathon_id
                )
                db.add(project)

            # Commit all changes
            db.commit()

            status = "success" if len(errors) == 0 else ("partial" if teams_created > 0 else "error")

            return {
                "status": status,
                "summary": {
                    "rows_processed": len(rows),
                    "teams_created": teams_created,
                    "participants_created": participants_created,
                    "errors": len(errors),
                    "warnings": len(warnings)
                },
                "errors": errors,
                "warnings": warnings
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Import failed: {str(e)}")
            raise ValueError(f"Database import failed: {str(e)}")
