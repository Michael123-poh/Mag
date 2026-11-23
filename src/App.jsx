import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider.jsx'
import RequireAuth from './components/layout/RequireAuth.jsx'
import Caisse from './pages/Caisse.jsx'
import CaisseHistorique from './pages/CaisseHistorique.jsx'
import ClientNouveau from './pages/ClientNouveau.jsx'
import Clients from './pages/Clients.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FactureDocument from './pages/FactureDocument.jsx'
import Factures from './pages/Factures.jsx'
import Login from './pages/Login.jsx'
import Parametres from './pages/Parametres.jsx'
import PrestationNouveau from './pages/PrestationNouveau.jsx'
import Prestations from './pages/Prestations.jsx'
import ProjetDetail from './pages/ProjetDetail.jsx'
import ProjetNouveau from './pages/ProjetNouveau.jsx'
import Projets from './pages/Projets.jsx'
import Rapport from './pages/Rapport.jsx'
import Stock from './pages/Stock.jsx'
import StockNouveau from './pages/StockNouveau.jsx'
import TacheNouveau from './pages/TacheNouveau.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<RequireAuth bare />}>
            <Route path="clients/nouveau" element={<ClientNouveau />} />
            <Route path="prestations/nouveau" element={<PrestationNouveau />} />
            <Route path="stock/nouveau" element={<StockNouveau />} />
            <Route path="projets/nouveau" element={<ProjetNouveau />} />
            <Route path="factures/:id" element={<FactureDocument />} />
            <Route path="projets/:id/taches/nouveau" element={<TacheNouveau />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="prestations" element={<Prestations />} />
            <Route path="projets" element={<Projets />} />
            <Route path="projets/:id" element={<ProjetDetail />} />
            <Route path="stock" element={<Stock />} />
            <Route path="caisse" element={<Caisse />} />
            <Route path="caisse/historique" element={<CaisseHistorique />} />
            <Route path="factures" element={<Factures />} />
            <Route path="rapports" element={<Rapport />} />
            <Route path="parametres" element={<Parametres />} />
            {/* Les autres pages seront ajoutées au fur et à mesure des maquettes */}
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
