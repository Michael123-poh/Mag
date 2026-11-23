import SearchFilterBar from '../ui/SearchFilterBar.jsx'

const selects = [
  {
    key: 'date',
    label: 'Date',
    options: [
      { value: '', label: 'Toutes les dates' },
      { value: 'semaine', label: 'Cette semaine' },
      { value: 'mois', label: 'Ce mois' },
      { value: '3m', label: '3 mois' },
      { value: '6m', label: '6 mois' },
      { value: '1a', label: '1 an' },
    ],
  },
  {
    key: 'solde',
    label: 'Solde',
    options: [
      { value: '', label: 'Tous les soldes' },
      ...['10', '20', '50', '70', '100'].map((n) => ({ value: n, label: `> ${n}K` })),
    ],
  },
]

// Ligne de recherche + deux sélecteurs compacts (date, solde).
export default function StockFilterBar({ onChange }) {
  return (
    <SearchFilterBar
      prefix="stk"
      placeholder="Rechercher un produit…"
      selects={selects}
      onChange={onChange}
      ariaLabel="Recherche et filtres du stock"
    />
  )
}
