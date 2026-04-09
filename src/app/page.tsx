import { prisma } from '@/lib/prisma';
import { Activity, AlertTriangle, ShieldAlert, FileText } from 'lucide-react';
import { DashboardCharts } from './DashboardCharts';

export const revalidate = 60; // Revalidate cache every 60s

export default async function Home() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Statistics
  const newArticlesCount = await prisma.article.count({
    where: { publishedAt: { gte: today } }
  });
  
  const highRiskArticles = await prisma.article.count({
    where: { publishedAt: { gte: today }, notableScore: { gte: 30 } }
  });

  const recentCves = await prisma.cve.count({
    where: { publishedAt: { gte: today } }
  });

  const latestStats = await prisma.article.findMany({
    where: { publishedAt: { gte: today } },
    select: { publishedAt: true, source: { select: { name: true } } }
  });
  
  // Aggregate hourly data
  const hourlyData = Array.from({ length: 24 }).map((_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    count: 0
  }));

  let topSources: Record<string, number> = {};

  latestStats.forEach(article => {
    const hour = article.publishedAt.getHours();
    hourlyData[hour].count += 1;
    
    if (article.source?.name) {
      topSources[article.source.name] = (topSources[article.source.name] || 0) + 1;
    }
  });

  const sourceData = Object.keys(topSources).map(name => ({
    name,
    value: topSources[name]
  })).sort((a,b) => b.value - a.value).slice(0, 5);

  return (
    <div className="p-4 md:p-8 overflow-x-hidden">
      <header className="mb-6 md:mb-8">
        <h2 className="text-3xl font-bold text-slate-50">Synthèse de la journée</h2>
        <p className="text-slate-400 mt-2">Activité depuis 00:00 (Mise à jour automatique)</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg ring-1 ring-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-slate-400 text-sm">Nouveaux Articles</p>
              <h3 className="text-4xl font-bold text-white mt-2">{newArticlesCount}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><FileText size={24}/></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 p-6 rounded-xl shadow-lg ring-1 ring-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-slate-400 text-sm">CVE CISA Détectées Aujourd'hui</p>
              <h3 className="text-4xl font-bold text-emerald-400 mt-2">{recentCves}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><ShieldAlert size={24}/></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg ring-1 ring-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-slate-400 text-sm">Alertes Majeures (Score &gt; 30)</p>
              <h3 className="text-4xl font-bold text-rose-400 mt-2">{highRiskArticles}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg"><AlertTriangle size={24}/></div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts hourlyData={hourlyData} sourceData={sourceData} />
    </div>
  );
}
