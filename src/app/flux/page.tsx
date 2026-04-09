import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const revalidate = 60; // 60s cache

export default async function FluxPage() {
  const articles = await prisma.article.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 100,
    include: { source: true }
  });

  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-50">Flux de Veille en continu</h2>
          <p className="text-slate-400 mt-2">Derniers articles et alertes CVE issus de vos sources sélectionnées</p>
        </div>
      </header>

      <div className="space-y-4 max-w-5xl">
        {articles.map((article) => (
          <a key={article.id} href={article.link} target="_blank" rel="noopener noreferrer" className="block p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all shadow-sm group">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2.5 py-1 text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300 rounded-md">
                    {article.source.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {format(new Date(article.publishedAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </span>
                  {article.notableScore >= 30 && (
                    <span className="px-2.5 py-1 text-xs font-bold bg-rose-500/20 text-rose-400 rounded-md flex items-center border border-rose-500/30">
                      ⚠️ Critique / Majeur
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-medium text-slate-100 mb-2 leading-snug group-hover:text-emerald-400 transition-colors">{article.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 w-full md:w-3/4">{article.summary || "Aucun résumé disponible."}</p>
              </div>
            </div>
          </a>
        ))}
        {articles.length === 0 && (
          <div className="p-8 text-center bg-slate-900 rounded-xl border border-dashed border-slate-700 text-slate-500">Aucun article trouvé. Le collecteur tourne en tâche de fond.</div>
        )}
      </div>
    </div>
  );
}
