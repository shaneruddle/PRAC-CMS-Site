import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Loader2, Globe } from 'lucide-react';
import { SiteConfig } from '@/types';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SiteConfig>({
    contactPhone: '',
    whatsapp: '',
    lineId: '',
    email: '',
    officeAddress: '',
    businessHours: '',
    trustSignals: {
      yearsInBusiness: '',
      customersServed: '',
      googleRating: '',
      googleReviewCount: '',
      facebookRating: '',
      facebookReviewCount: '',
    },
    socialLinks: {
      facebook: '',
      instagram: '',
      tiktok: '',
      youtube: '',
    }
  });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'site_config')).catch(e => handleFirestoreError(e, OperationType.GET, 'settings/site_config'));
        if (snap.exists()) {
          setConfig(snap.data() as SiteConfig);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site_config'), config);
      
      // Trigger deploy for global settings change
      await setDoc(doc(collection(db, 'deploy_triggers')), {
        triggeredAt: serverTimestamp(),
        triggeredBy: auth.currentUser?.email,
        status: 'queued',
        changedCollection: 'settings',
        changedDocId: 'site_config'
      });
      
      toast.success('Settings saved and deploy triggered');
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center font-mono animate-pulse">LOADING SITE CONFIG...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Site Settings</h1>
          <p className="text-slate-500">Global configuration for the marketing website.</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save & Publish
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={config.contactPhone} onChange={(e) => setConfig({...config, contactPhone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={config.email} onChange={(e) => setConfig({...config, email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={config.whatsapp} onChange={(e) => setConfig({...config, whatsapp: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Line ID</Label>
                <Input value={config.lineId} onChange={(e) => setConfig({...config, lineId: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Office Address</Label>
              <Textarea value={config.officeAddress} onChange={(e) => setConfig({...config, officeAddress: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Business Hours</Label>
              <Input value={config.businessHours} onChange={(e) => setConfig({...config, businessHours: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Social Media Links</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Facebook URL</Label>
              <Input value={config.socialLinks.facebook} onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, facebook: e.target.value}})} />
            </div>
            <div className="space-y-2">
              <Label>Instagram URL</Label>
              <Input value={config.socialLinks.instagram} onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, instagram: e.target.value}})} />
            </div>
            <div className="space-y-2">
              <Label>TikTok URL</Label>
              <Input value={config.socialLinks.tiktok} onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, tiktok: e.target.value}})} />
            </div>
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input value={config.socialLinks.youtube} onChange={(e) => setConfig({...config, socialLinks: {...config.socialLinks, youtube: e.target.value}})} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-lg">Trust Signals & Ratings</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Years in Business</Label>
                  <Input value={config.trustSignals.yearsInBusiness} onChange={(e) => setConfig({...config, trustSignals: {...config.trustSignals, yearsInBusiness: e.target.value}})} />
                </div>
                <div className="space-y-2">
                  <Label>Customers Served</Label>
                  <Input value={config.trustSignals.customersServed} onChange={(e) => setConfig({...config, trustSignals: {...config.trustSignals, customersServed: e.target.value}})} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Google Rating (0-5)</Label>
                  <Input value={config.trustSignals.googleRating} onChange={(e) => setConfig({...config, trustSignals: {...config.trustSignals, googleRating: e.target.value}})} />
                </div>
                <div className="space-y-2">
                  <Label>Google Review Count</Label>
                  <Input value={config.trustSignals.googleReviewCount} onChange={(e) => setConfig({...config, trustSignals: {...config.trustSignals, googleReviewCount: e.target.value}})} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Facebook Rating (0-5)</Label>
                  <Input value={config.trustSignals.facebookRating} onChange={(e) => setConfig({...config, trustSignals: {...config.trustSignals, facebookRating: e.target.value}})} />
                </div>
                <div className="space-y-2">
                  <Label>Facebook Review Count</Label>
                  <Input value={config.trustSignals.facebookReviewCount} onChange={(e) => setConfig({...config, trustSignals: {...config.trustSignals, facebookReviewCount: e.target.value}})} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
