import { useState, useRef } from 'react'
import { PageTransition } from '../../../components/PageTransition'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, UploadCloud, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import * as xlsx from 'xlsx'
import { api } from '../../../lib/api'

// --- Types ---
type Team = { TeamName: string; Member1: string; Member2?: string; Member3?: string }
type Criterion = { id: string; name: string; maxPoints: number }
type Round = { id: string; name: string; criteria: Criterion[] }

export default function CreateEvent() {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  // -- Master State --
  const [eventName, setEventName] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [judges, setJudges] = useState<string[]>([])
  const [coordinators, setCoordinators] = useState<string[]>([])
  const [rounds, setRounds] = useState<Round[]>([
    { id: '1', name: 'Initial Pitch', criteria: [{ id: 'c1', name: 'Innovation', maxPoints: 10 }] }
  ])

  const nextStep = () => setStep(s => Math.min(s + 1, 4))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      const payload = {
        name: eventName,
        description: "Hackathon created via wizard", // Placeholder if we don't have step 1 state
        teams: teams.map(t => ({
          name: t.TeamName || 'Unnamed Team',
          members: [
            { name: t.Member1 },
            ...(t.Member2 ? [{ name: t.Member2 }] : []),
            ...(t.Member3 ? [{ name: t.Member3 }] : [])
          ]
        })),
        rounds: rounds.map(r => ({
          name: r.name,
          criteria: r.criteria.map(c => ({
            name: c.name,
            max_points: c.maxPoints
          }))
        }))
      }

      await api.post('/hackathons', payload)
      navigate('/dashboard/mentor')
    } catch (err) {
      console.error("Failed to deploy hackathon", err)
      alert("Failed to create hackathon. Check console.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto w-full px-6 py-12 md:py-20 flex flex-col min-h-[85vh]">
        {/* Header & Progress */}
        <div className="mb-12">
          <Link to="/dashboard/mentor" className="text-sm font-bold uppercase tracking-wider mb-6 inline-flex items-center gap-2 hover:opacity-60 transition-opacity">
            <ArrowLeft className="w-4 h-4" /> Cancel Setup
          </Link>
          <div className="flex items-center justify-between border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Setup Hackathon</h1>
            <div className="flex gap-2 font-mono font-bold tracking-widest text-lg text-slate-700">
              <span>{step}</span><span className="opacity-40">/ 4</span>
            </div>
          </div>
          
          {/* Progress Bar Container */}
          <div className="w-full h-1 bg-slate-100 mt-0">
            <motion.div 
              className="h-full bg-indigo-600 rounded-r-full" 
              initial={{ width: '25%' }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Wizard Steps Area */}
        <div className="flex-grow flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && <Step1Details key="s1" eventName={eventName} setEventName={setEventName} />}
            {step === 2 && <Step2Teams key="s2" teams={teams} setTeams={setTeams} />}
            {step === 3 && <Step3Roles key="s3" judges={judges} setJudges={setJudges} coordinators={coordinators} setCoordinators={setCoordinators} />}
            {step === 4 && <Step4Rounds key="s4" rounds={rounds} setRounds={setRounds} />}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between bg-white/50 backdrop-blur-sm sticky bottom-0 z-10 -mx-6 px-6 pb-6">
          <Button variant="outline" onClick={prevStep} className={step === 1 ? 'invisible' : ''}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          
          {step < 4 ? (
            <Button onClick={nextStep} className={!eventName && step === 1 ? 'opacity-50 pointer-events-none' : ''}>
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={isSubmitting}>
              {isSubmitting ? 'Deploying...' : 'Deploy Hackathon'} <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </PageTransition>
  )
}

// --- Steps Components ---

const slideVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}

function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={slideVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-8 flex-grow"
    >
      {children}
    </motion.div>
  )
}

// STEP 1
function Step1Details({ eventName, setEventName }: { eventName: string, setEventName: (v: string) => void }) {
  return (
    <StepWrapper>
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-tight mb-2">Event Basics</h2>
        <p className="text-neutral-500 font-medium">Give your incredible hackathon a name and basic details.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-wider">Hackathon Title *</label>
          <Input 
            autoFocus
            value={eventName} 
            onChange={(e) => setEventName(e.target.value)} 
            placeholder="e.g. Global AI Hackfest 2026" 
            className="text-lg py-4"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider">Start Date</label>
            <Input type="date" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider">End Date</label>
            <Input type="date" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-wider">Short Description</label>
          <textarea 
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-none hover:rounded-md focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:rounded-md placeholder:text-slate-400 font-medium transition-all"
            rows={4}
            placeholder="Describe the main theme or goal format..."
          />
        </div>
      </div>
    </StepWrapper>
  )
}

// STEP 2
function Step2Teams({ teams, setTeams }: { teams: Team[], setTeams: (t: Team[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = xlsx.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const json = xlsx.utils.sheet_to_json<Team>(worksheet)
      
      if (json.length > 0) {
        setTeams(json)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <StepWrapper>
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight mb-2">Import Participants</h2>
          <p className="text-neutral-500 font-medium">Upload a CSV or XLSX file containing team lists.</p>
        </div>
        {teams.length > 0 && (
          <Button variant="outline" onClick={() => setTeams([])} className="py-2 h-10 text-xs">Clear All</Button>
        )}
      </div>

      {teams.length === 0 ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-slate-200 border-dashed h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all rounded-none"
        >
          <UploadCloud className="w-12 h-12 mb-4 group-hover:-translate-y-2 transition-transform duration-300" />
          <p className="font-bold uppercase tracking-widest text-lg">Click or Drag File</p>
          <p className="text-neutral-500 font-medium mt-1">Supports .csv and .xlsx formats</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="border border-slate-200 max-h-96 overflow-y-auto rounded-none">
          <table className="w-full text-left text-sm font-medium">
            <thead className="bg-slate-50 uppercase tracking-widest text-xs border-b border-slate-200 z-10 sticky top-0">
              <tr>
                <th className="p-4 border-r border-slate-200">Team Name</th>
                <th className="p-4">Members Preview</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t, idx) => (
                <tr key={idx} className="border-b last:border-b-0 border-neutral-200">
                  <td className="p-4 border-r border-slate-200 font-bold">{t.TeamName || `Team-${idx}`}</td>
                  <td className="p-4 text-neutral-600 truncate max-w-sm">
                    {t.Member1} {t.Member2 ? `, ${t.Member2}` : ''} {t.Member3 ? `, ${t.Member3}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-black text-white text-xs font-bold uppercase tracking-widest text-center">
            {teams.length} Teams Imported Successfully
          </div>
        </div>
      )}
    </StepWrapper>
  )
}

// STEP 3
function Step3Roles({ judges, setJudges, coordinators, setCoordinators }: any) {
  return (
    <StepWrapper>
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-tight mb-2">Staff & Judges</h2>
        <p className="text-neutral-500 font-medium">Assign platform access to your evaluating committee and coordinators.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <RoleList title="Judges" items={judges} setItems={setJudges} placeholder="judge@university.edu" />
        <RoleList title="Student Coordinators" items={coordinators} setItems={setCoordinators} placeholder="student@university.edu" />
      </div>
    </StepWrapper>
  )
}

function RoleList({ title, items, setItems, placeholder }: { title: string, items: string[], setItems: (v: string[]) => void, placeholder: string }) {
  const [val, setVal] = useState('')
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (val.trim() && !items.includes(val.trim())) {
      setItems([...items, val.trim()])
      setVal('')
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold uppercase tracking-wider text-sm border-b border-slate-200 pb-2">{title} ({items.length})</h3>
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder} className="py-2" />
        <Button variant="outline" type="submit" className="px-4 py-2 border-2"><Plus className="w-4 h-4" /></Button>
      </form>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {items.length === 0 && <p className="text-xs font-medium text-neutral-400 italic">No {title.toLowerCase()} added.</p>}
        {items.map(item => (
          <div key={item} className="flex justify-between items-center p-3 border border-neutral-300 bg-neutral-50 text-sm font-medium">
            <span className="truncate">{item}</span>
            <button onClick={() => setItems(items.filter(i => i !== item))} className="text-neutral-400 hover:text-black">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// STEP 4
function Step4Rounds({ rounds, setRounds }: { rounds: Round[], setRounds: (r: Round[]) => void }) {
  const addRound = () => {
    setRounds([...rounds, { id: Date.now().toString(), name: `Round ${rounds.length + 1}`, criteria: [] }])
  }

  const deleteRound = (rId: string) => {
    setRounds(rounds.filter(r => r.id !== rId))
  }

  const updateRoundName = (rId: string, name: string) => {
    setRounds(rounds.map(r => r.id === rId ? { ...r, name } : r))
  }

  const addCriterion = (rId: string) => {
    setRounds(rounds.map(r => {
      if (r.id === rId) {
        return { ...r, criteria: [...r.criteria, { id: Date.now().toString(), name: 'New Criteria', maxPoints: 10 }] }
      }
      return r
    }))
  }

  const updateCriterion = (rId: string, cId: string, field: 'name' | 'maxPoints', val: string | number) => {
    setRounds(rounds.map(r => r.id === rId ? {
      ...r, criteria: r.criteria.map(c => c.id === cId ? { ...c, [field]: val } : c)
    } : r))
  }

  const deleteCriterion = (rId: string, cId: string) => {
    setRounds(rounds.map(r => r.id === rId ? {
      ...r, criteria: r.criteria.filter(c => c.id !== cId)
    } : r))
  }

  return (
    <StepWrapper>
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight mb-2">Configure Rubrics</h2>
          <p className="text-neutral-500 font-medium">Define rounds and the specific scoring criteria for each.</p>
        </div>
        <Button variant="outline" onClick={addRound} className="py-2 h-10 text-xs">
          <Plus className="w-4 h-4 mr-1" /> Add Round
        </Button>
      </div>

      <div className="space-y-8 max-h-[50vh] overflow-y-auto pr-2 pb-8">
        {rounds.map((round, idx) => (
          <div key={round.id} className="border border-slate-200 p-6 relative group rounded-none hover:rounded-lg transition-all hover:shadow-sm">
             <button onClick={() => deleteRound(round.id)} className="absolute -top-3 -right-3 bg-white border border-slate-300 p-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all rounded-none hover:rounded-md opacity-0 group-hover:opacity-100">
               <Trash2 className="w-4 h-4" />
             </button>

            <div className="flex gap-4 mb-6">
              <span className="font-black text-4xl block w-12 pt-1">{idx + 1}.</span>
              <Input 
                value={round.name} 
                onChange={e => updateRoundName(round.id, e.target.value)} 
                className="text-xl font-bold py-2 px-2 border-t-0 border-l-0 border-r-0 border-b-2"
              />
            </div>

            <div className="ml-16 space-y-3">
              <div className="flex font-bold uppercase tracking-wider text-xs border-b border-slate-200 pb-2 text-slate-500">
                <span className="flex-grow">Criteria Title</span>
                <span className="w-24 text-right">Max Points</span>
                <span className="w-10"></span>
              </div>
              
              {round.criteria.length === 0 && <div className="text-sm font-medium text-neutral-400 py-2">No scoring criteria added. Defaults to comparative voting.</div>}

              {round.criteria.map(c => (
                <div key={c.id} className="flex gap-4 items-center">
                  <Input 
                    value={c.name} 
                    onChange={e => updateCriterion(round.id, c.id, 'name', e.target.value)} 
                    className="flex-grow py-2 h-10 border border-slate-200 rounded-none focus:rounded-md focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                  <Input 
                    type="number"
                    value={c.maxPoints} 
                    onChange={e => updateCriterion(round.id, c.id, 'maxPoints', Number(e.target.value))} 
                    className="w-24 py-2 h-10 text-center font-mono border border-slate-200 rounded-none focus:rounded-md focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                  <button onClick={() => deleteCriterion(round.id, c.id)} className="text-neutral-400 hover:text-black w-6 flex justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <Button variant="ghost" onClick={() => addCriterion(round.id)} className="w-full border border-dashed border-slate-300 py-2 h-10 text-sm mt-4 text-slate-500 hover:text-slate-700 hover:border-slate-400 rounded-none hover:rounded-md transition-all">
                <Plus className="w-4 h-4 mr-2" /> Add Criterion
              </Button>
            </div>
          </div>
        ))}
        {rounds.length === 0 && (
          <div className="border border-dashed border-slate-300 p-8 text-center text-slate-500 font-medium rounded-none hover:rounded-lg transition-all">
            Create at least one evaluation round to proceed.
          </div>
        )}
      </div>
    </StepWrapper>
  )
}
