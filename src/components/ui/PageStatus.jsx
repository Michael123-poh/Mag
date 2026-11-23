import PageShell from '../layout/PageShell.jsx'

// Affiché à la place d'une page pendant le chargement ou en cas d'erreur.
export default function PageStatus({ loading, error, onRetry }) {
  return (
    <PageShell>
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center">
        {loading ? (
          <p className="text-[24px] text-gaia-700/70">Chargement…</p>
        ) : (
          <>
            <p className="text-[26px]">
              {error?.status === 403 ? "Vous n'avez pas accès à cette rubrique." : 'Impossible de charger les données.'}
            </p>
            {error?.status !== 403 && (
              <>
                <p className="text-[18px] text-gaia-700/60">{error?.message}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-full bg-gaia-700 px-5 py-1 text-[20px] text-white"
                >
                  Réessayer
                </button>
              </>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
