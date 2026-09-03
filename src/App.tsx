import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Create } from "./pages/Create";
import { Ingest } from "./pages/Ingest";
import { Transcode } from "./pages/Transcode";
import { Reports } from "./pages/Reports";
import { Profiles } from "./pages/Profiles";
import { ConfigPage } from "./pages/ConfigPage";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<Create />} />
          <Route path="/ingest" element={<Ingest />} />
          <Route path="/transcode" element={<Transcode />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/config" element={<ConfigPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
