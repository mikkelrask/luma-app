import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { applyTheme, installSystemListeners } from "./lib/theme";
import { JobsProvider } from "./lib/jobs";
import { SessionProvider } from "./lib/session";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Dashboard } from "./pages/Dashboard";
import { Create } from "./pages/Create";
import { Ingest } from "./pages/Ingest";
import { Transcode } from "./pages/Transcode";
import { Reports } from "./pages/Reports";
import { Library } from "./pages/Library";
import { ProfilesTab } from "./pages/library/ProfilesTab";
import { TransformsTab } from "./pages/library/TransformsTab";
import { LutsTab } from "./pages/library/LutsTab";
import { ConfigPage } from "./pages/ConfigPage";

// Nav destinations live in src/lib/nav.ts; this route table stays manual because
// each route needs an element ref.

function App() {
  useEffect(() => {
    void applyTheme();
    const retry = window.setTimeout(() => void applyTheme(), 600);
    const stop = installSystemListeners();
    return () => {
      window.clearTimeout(retry);
      stop();
    };
  }, []);

  return (
    <HashRouter>
      <ErrorBoundary>
        <JobsProvider>
          <SessionProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/create" element={<Create />} />
                <Route path="/ingest" element={<Ingest />} />
                <Route path="/transcode" element={<Transcode />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/library" element={<Library />}>
                  <Route index element={<Navigate to="/library/profiles" replace />} />
                  <Route path="profiles" element={<ProfilesTab />} />
                  <Route path="transforms" element={<TransformsTab />} />
                  <Route path="luts" element={<LutsTab />} />
                </Route>
                <Route path="/profiles" element={<Navigate to="/library/profiles" replace />} />
                <Route path="/config" element={<ConfigPage />} />
              </Route>
            </Routes>
          </SessionProvider>
        </JobsProvider>
      </ErrorBoundary>
    </HashRouter>
  );
}

export default App;
