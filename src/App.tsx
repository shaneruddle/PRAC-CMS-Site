import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AdminLayout } from './components/layout/AdminLayout';
import Login from './pages/Login';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BlogList = lazy(() => import('./pages/blog/BlogList'));
const BlogEditor = lazy(() => import('./pages/blog/BlogEditor'));
const LocationList = lazy(() => import('./pages/locations/LocationList'));
const LocationEditor = lazy(() => import('./pages/locations/LocationEditor'));
const VehicleGuideList = lazy(() => import('./pages/vehicle-guides/VehicleGuideList'));
const VehicleGuideEditor = lazy(() => import('./pages/vehicle-guides/VehicleGuideEditor'));
const FaqList = lazy(() => import('./pages/faqs/FaqList'));
const FaqEditor = lazy(() => import('./pages/faqs/FaqEditor'));
const Media = lazy(() => import('./pages/Media'));
const Deploys = lazy(() => import('./pages/Deploys'));
const Logs = lazy(() => import('./pages/Logs'));
const GrowthDashboard = lazy(() => import('./pages/growth/GrowthDashboard'));
const SEOKnowledge = lazy(() => import('./pages/growth/SEOKnowledge'));

function LoadingScreen() {
  return (
    <div className="h-full w-full flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<AdminLayout />}>
            <Route path="/" element={
              <Suspense fallback={<LoadingScreen />}><Dashboard /></Suspense>
            } />
            
            <Route path="/blog" element={
              <Suspense fallback={<LoadingScreen />}><BlogList /></Suspense>
            } />
            <Route path="/blog/new" element={
              <Suspense fallback={<LoadingScreen />}><BlogEditor /></Suspense>
            } />
            <Route path="/blog/:slug" element={
              <Suspense fallback={<LoadingScreen />}><BlogEditor /></Suspense>
            } />

            <Route path="/locations" element={
              <Suspense fallback={<LoadingScreen />}><LocationList /></Suspense>
            } />
            <Route path="/locations/:slug" element={
              <Suspense fallback={<LoadingScreen />}><LocationEditor /></Suspense>
            } />

            <Route path="/vehicle-guides" element={
                            <Suspense fallback={<LoadingScreen />}><VehicleGuideList /></Suspense>
            } />
            <Route path="/vehicle-guides/new" element={
                            <Suspense fallback={<LoadingScreen />}><VehicleGuideEditor /></Suspense>
            } />
            <Route path="/vehicle-guides/:slug" element={
                            <Suspense fallback={<LoadingScreen />}><VehicleGuideEditor /></Suspense>
            } />

            <Route path="/faqs" element={
              <Suspense fallback={<LoadingScreen />}><FaqList /></Suspense>
            } />
            <Route path="/faqs/new" element={
              <Suspense fallback={<LoadingScreen />}><FaqEditor /></Suspense>
            } />
            <Route path="/faqs/:id" element={
              <Suspense fallback={<LoadingScreen />}><FaqEditor /></Suspense>
            } />

            <Route path="/media" element={
              <Suspense fallback={<LoadingScreen />}><Media /></Suspense>
            } />
            <Route path="/deploys" element={
              <Suspense fallback={<LoadingScreen />}><Deploys /></Suspense>
            } />
            <Route path="/logs" element={
              <Suspense fallback={<LoadingScreen />}><Logs /></Suspense>
            } />
            <Route path="/growth" element={
              <Suspense fallback={<LoadingScreen />}><GrowthDashboard /></Suspense>
            } />
            <Route path="/growth/knowledge" element={
              <Suspense fallback={<LoadingScreen />}><SEOKnowledge /></Suspense>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
