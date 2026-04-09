import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function CvePage() {
  const cves = await prisma.cve.findMany({
    orderBy: {
      publishedAt: 'desc',
    },
    take: 100, // Les 100 dernières failles exploitées
  });

  return (
    <div className="p-4 md:p-8">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-rose-500">Failles Actives (KEV)</h2>
          <p className="text-slate-400 mt-2">Dernières failles du CISA Known Exploited Vulnerabilities Catalog.</p>
        </div>
      </header>
      
      <div className="grid grid-cols-1 gap-4">
        {cves.length === 0 ? (
          <div className="text-slate-500 p-8 text-center bg-slate-900 rounded-lg border border-slate-800">
            Aucune faille KEV récupérée pour le moment. Le Worker va se synchroniser dans 5 minutes.
          </div>
        ) : (
          cves.map((cve) => (
            <div key={cve.id} className="bg-slate-900 border border-rose-500/30 p-4 md:p-5 rounded-lg shadow-sm hover:border-rose-500 transition-colors">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 space-y-2 sm:space-y-0">
                <div>
                  <h3 className="text-lg font-bold text-rose-400 font-mono">{cve.cveId}</h3>
                  <div className="text-xs text-slate-500 mt-1">
                    Exploitée depuis le {format(new Date(cve.publishedAt), 'dd MMMM yyyy', { locale: fr })}
                  </div>
                </div>
                <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded text-xs font-bold uppercase tracking-wider">
                  CRITIQUE / EXPLOITÈE
                </div>
              </div>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                {cve.description}
              </p>
              <div className="mt-4 flex space-x-3">
                <a 
                  href={`https://nvd.nist.gov/vuln/detail/${cve.cveId}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs font-semibold px-3 py-1.5 bg-slate-950 border border-slate-800 text-blue-400 hover:bg-slate-800 rounded transition-colors"
                >
                  Détails NVD
                </a>
                <a 
                  href={`https://www.google.com/search?q=${cve.cveId}+exploit`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs font-semibold px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white rounded transition-colors"
                >
                  Recherche d'exploits
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
