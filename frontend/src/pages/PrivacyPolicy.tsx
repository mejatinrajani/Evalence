import { PageTransition } from '../components/PageTransition'

export default function PrivacyPolicy() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-6 py-20 w-full">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-12 border-b border-black pb-8">
          Privacy Policy
        </h1>
        
        <div className="space-y-12 text-lg font-medium opacity-80 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-black mb-4">1. Data Collection</h2>
            <p>We collect minimal information required to host and evaluate hackathons. This includes your name, email address, GitHub profile links, and any project code submitted to the platform. We do not sell your data.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-black mb-4">2. Evaluation Metrics</h2>
            <p>Scores and evaluations submitted by judges remain strictly within the Evalence platform ecosystem and are used solely for calculating leaderboard standings via our normalization algorithm.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-black mb-4">3. Data Deletion</h2>
            <p>You may request deletion of your account and associated hackathon data at any time by contacting our support channel. Associated metadata tied to aggregated leaderboards may be anonymized rather than strictly deleted to preserve the integrity of historical hackathon data.</p>
          </section>
        </div>
      </div>
    </PageTransition>
  )
}
