import { useState, useEffect } from 'react';
import {
  Store, Palette, Eye, Save, MoveUp, MoveDown, Plus, Trash2, Edit3,
  FileText, Menu, Layout, Monitor, Smartphone
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { StorefrontView } from '../storefront/StorefrontView';
import {
  useStorefrontConfigQuery,
  useUpdateStorefrontDraftConfigMutation,
  usePublishStorefrontConfigMutation,
  usePagesQuery,
  useCreatePageMutation,
  useUpdatePageMutation,
  useDeletePageMutation,
  useNavigationMenusQuery,
  useSaveNavigationMenuMutation,
} from '../../hooks/usePhase7Queries';
import type {
  StorefrontSection as StorefrontSectionConfig,
  StorefrontTheme,
} from '../../api/storefrontConfig';
import type { NavigationMenuData } from '../../api/navigation';
import toast from 'react-hot-toast';

/**
 * A stable empty default. Writing `= []` inline would build a new array on every
 * render while the query is still loading, and this value is a dependency of the
 * effect below — which made that effect re-run and re-set state forever.
 */
const NO_MENUS: NavigationMenuData[] = [];

export function StorefrontSection() {
  const { store } = useApp();
  const [activeTab, setActiveTab] = useState<'theme' | 'sections' | 'pages' | 'navigation'>('theme');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);

  // Storefront Config Query
  const { data: configData } = useStorefrontConfigQuery();
  const updateDraftMutation = useUpdateStorefrontDraftConfigMutation();
  const publishMutation = usePublishStorefrontConfigMutation();

  // Pages Query
  const { data: pagesData = [] } = usePagesQuery();
  const createPageMutation = useCreatePageMutation();
  const updatePageMutation = useUpdatePageMutation();
  const deletePageMutation = useDeletePageMutation();

  // Navigation Query
  const { data: navData = NO_MENUS } = useNavigationMenusQuery();
  const saveNavMutation = useSaveNavigationMenuMutation();

  // Local Draft State
  // Typed against the API's config shape so the loaded draft can replace it.
  const [theme, setTheme] = useState<StorefrontTheme>({
    primaryColor: '#FFBD2E',
    fontFamily: 'Inter',
    accentColor: '#27C93F',
    bannerText: '🎉 Flash Sale: Get 20% off all summer collections with code SUMMER20',
  });

  const [sections, setSections] = useState<StorefrontSectionConfig[]>([
    { id: 'announcement-1', type: 'announcement', enabled: true, settings: { text: '🎉 Flash Sale: Get 20% off with code SUMMER20' } },
    { id: 'header-1', type: 'header', enabled: true, settings: { logoText: store?.name || 'Aura Apparel' } },
    { id: 'hero-1', type: 'hero', enabled: true, settings: { title: 'Elevate Your Daily Style', subtitle: 'Crafted with sustainable fabrics', ctaText: 'Shop Summer Drop' } },
    { id: 'featured-products-1', type: 'featured-products', enabled: true, settings: { title: 'Featured Arrivals', limit: 4 } },
    { id: 'footer-1', type: 'footer', enabled: true, settings: { copyright: '© 2026 Aura Apparel. All rights reserved.' } },
  ]);

  // Sync loaded config to local draft state. The stored theme is merged over the
  // defaults rather than replacing them: a draft saved before a field existed has
  // no value for it, and assigning undefined to a bound input turns that input
  // from controlled to uncontrolled.
  useEffect(() => {
    if (configData?.draftConfig) {
      if (configData.draftConfig.theme) {
        setTheme(prev => ({ ...prev, ...configData.draftConfig.theme }));
      }
      if (configData.draftConfig.sections && configData.draftConfig.sections.length > 0) {
        setSections(configData.draftConfig.sections);
      }
    }
  }, [configData]);

  // Pages Modal / Edit State
  const [editingPage, setEditingPage] = useState<{ id?: string; title: string; slug: string; content: string; isPublished: boolean } | null>(null);

  // Nav Menu State
  const [selectedNavHandle, setSelectedNavHandle] = useState('main-menu');
  const [navItems, setNavItems] = useState<{ id: string; label: string; url: string; order: number }[]>([]);

  useEffect(() => {
    const currentMenu = navData.find(m => m.handle === selectedNavHandle);
    if (currentMenu) {
      setNavItems(currentMenu.items || []);
    } else if (selectedNavHandle === 'main-menu') {
      setNavItems([
        { id: '1', label: 'Home', url: '/', order: 0 },
        { id: '2', label: 'Shop All', url: '/products', order: 1 },
        { id: '3', label: 'About', url: '/pages/about', order: 2 },
      ]);
    }
  }, [selectedNavHandle, navData]);

  const handleSaveDraft = async () => {
    try {
      await updateDraftMutation.mutateAsync({
        theme,
        sections,
      });
      toast.success('Draft storefront config saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft config');
    }
  };

  const handlePublish = async () => {
    try {
      await handleSaveDraft();
      await publishMutation.mutateAsync();
      toast.success('Storefront changes published live!', { icon: '✨' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish storefront');
    }
  };

  // Section Ordering
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setSections(newSections);
  };

  const toggleSection = (id: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  // Save Page
  const handleSavePage = async () => {
    if (!editingPage) return;
    if (!editingPage.title.trim()) {
      toast.error('Page title is required');
      return;
    }
    try {
      if (editingPage.id) {
        await updatePageMutation.mutateAsync({ id: editingPage.id, page: editingPage });
        toast.success('Page updated!');
      } else {
        await createPageMutation.mutateAsync(editingPage);
        toast.success('Page created!');
      }
      setEditingPage(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save page');
    }
  };

  // Save Nav Items
  const handleSaveNavItems = async () => {
    try {
      await saveNavMutation.mutateAsync({
        handle: selectedNavHandle,
        title: selectedNavHandle === 'main-menu' ? 'Main Menu' : 'Footer Menu',
        items: navItems,
      });
      toast.success('Navigation menu saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save navigation menu');
    }
  };

  const storeSlug = store?.id;

  return (
    <div className="space-y-6">
      {/* Live Storefront Modal Overlay */}
      {showLivePreviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90">
          <StorefrontView storeSlug={storeSlug} onClose={() => setShowLivePreviewModal(false)} />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Store className="text-[#FFBD2E]" size={22} /> Storefront Builder & Theme Editor
            </h2>
            {configData?.isPublished ? (
              <Badge variant="success" size="sm" dot>Published Live</Badge>
            ) : (
              <Badge variant="warning" size="sm" dot>Draft Changes Pending</Badge>
            )}
          </div>
          <p className="text-xs text-muted mt-1">Customize storefront sections, theme tokens, pages, and navigation menus.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Eye size={14} />}
            onClick={() => setShowLivePreviewModal(true)}
          >
            Live Store Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={updateDraftMutation.isPending}
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={publishMutation.isPending}
            onClick={handlePublish}
            icon={<Save size={14} />}
          >
            Publish Changes
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'theme', label: 'Theme & Style', icon: <Palette size={14} /> },
          { id: 'sections', label: 'Sections & Layout', icon: <Layout size={14} /> },
          { id: 'pages', label: 'Custom Pages', icon: <FileText size={14} /> },
          { id: 'navigation', label: 'Navigation Menus', icon: <Menu size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === tab.id
                ? 'bg-[#FFBD2E]/20 text-[#FFBD2E] border border-[#FFBD2E]/40'
                : 'text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-6 space-y-6">
          {/* TAB 1: Theme & Style */}
          {activeTab === 'theme' && (
            <div className="stat-card p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette size={16} className="text-[#FFBD2E]" /> Theme Tokens & Branding
              </h3>
              <div className="space-y-4 text-xs">
                <div>
                  <label htmlFor="storefrontsection-top-announcement-banner-1" className="block text-secondary mb-1">Top Announcement Banner</label>
                  <input id="storefrontsection-top-announcement-banner-1"
                    type="text"
                    value={theme.bannerText}
                    onChange={(e) => setTheme({ ...theme, bannerText: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFBD2E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-secondary mb-1">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        aria-label="Primary colour"
                        value={theme.primaryColor}
                        onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                        className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                      />
                      <span className="font-mono text-strong">{theme.primaryColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-secondary mb-1">Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        aria-label="Accent colour"
                        value={theme.accentColor}
                        onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                        className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                      />
                      <span className="font-mono text-strong">{theme.accentColor}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="storefrontsection-font-family-4" className="block text-secondary mb-1">Font Family</label>
                  <select id="storefrontsection-font-family-4"
                    value={theme.fontFamily}
                    onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#121528] border border-white/10 text-white focus:outline-none focus:border-[#FFBD2E]"
                  >
                    <option value="Inter">Inter (Modern Clean)</option>
                    <option value="Roboto">Roboto (Geometric)</option>
                    <option value="Playfair Display">Playfair Display (Luxury Serif)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans (Tech)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Sections & Layout */}
          {activeTab === 'sections' && (
            <div className="stat-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layout size={16} className="text-[#27C93F]" /> Section Reordering & Controls
                </h3>
                <span className="text-[11px] text-muted">Use arrows to reorder sections</span>
              </div>

              <div className="space-y-3">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                      sec.enabled
                        ? 'bg-white/5 border-white/10 text-white'
                        : 'bg-white/2 border-white/5 text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Show the ${sec.type} section`}
                        checked={sec.enabled}
                        onChange={() => toggleSection(sec.id)}
                        className="w-4 h-4 rounded accent-[#27C93F] cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold capitalize">{sec.type} Section</p>
                        <p className="text-[10px] text-muted font-mono">{sec.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button aria-label={`Move the ${sec.type} section up`}
                        onClick={() => moveSection(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 text-body"
                      >
                        <MoveUp size={13} />
                      </button>
                      <button aria-label={`Move the ${sec.type} section down`}
                        onClick={() => moveSection(idx, 'down')}
                        disabled={idx === sections.length - 1}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 text-body"
                      >
                        <MoveDown size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Pages Builder */}
          {activeTab === 'pages' && (
            <div className="stat-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText size={16} className="text-[#FF5F56]" /> Store Pages Builder
                </h3>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={13} />}
                  onClick={() => setEditingPage({ title: '', slug: '', content: '', isPublished: true })}
                >
                  Create Page
                </Button>
              </div>

              {editingPage ? (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-white">{editingPage.id ? 'Edit Page' : 'New Custom Page'}</h4>
                  <Input
                    label="Page Title"
                    value={editingPage.title}
                    onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="e.g. Return Policy"
                  />
                  <Input
                    label="URL Slug"
                    value={editingPage.slug}
                    onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                    placeholder="e.g. return-policy"
                  />
                  <div>
                    <label htmlFor="storefrontsection-page-content-html-markdown-6" className="block text-xs font-medium text-body mb-1">Page Content (HTML/Markdown)</label>
                    <textarea id="storefrontsection-page-content-html-markdown-6"
                      rows={4}
                      value={editingPage.content}
                      onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                      className="form-input bg-[#121528] text-white text-xs resize-none"
                      placeholder="Write your page body text…"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="primary" size="sm" onClick={handleSavePage}>Save Page</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingPage(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {pagesData.length === 0 ? (
                    <p className="text-xs text-muted text-center py-4">No custom store pages created yet.</p>
                  ) : (
                    pagesData.map((page: any) => (
                      <div key={page.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{page.title}</p>
                          <p className="text-[10px] text-muted font-mono">/pages/{page.slug}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {page.isPublished ? (
                            <Badge variant="success" size="sm">Published</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">Draft</Badge>
                          )}
                          <button aria-label="Edit"
                            onClick={() => setEditingPage(page)}
                            className="p-1 text-secondary hover:text-white"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button aria-label="Delete"
                            onClick={async () => {
                              if (confirm(`Delete page "${page.title}"?`)) {
                                await deletePageMutation.mutateAsync(page.id);
                                toast.success('Page deleted');
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Navigation Menus */}
          {activeTab === 'navigation' && (
            <div className="stat-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Menu size={16} className="text-[#FFBD2E]" /> Navigation Menu Editor
                </h3>
                <select
                  aria-label="Navigation menu"
                  value={selectedNavHandle}
                  onChange={(e) => setSelectedNavHandle(e.target.value)}
                  className="px-2.5 py-1 rounded bg-[#121528] border border-white/10 text-white text-xs"
                >
                  <option value="main-menu">Main Navigation Header</option>
                  <option value="footer-menu">Footer Menu Links</option>
                </select>
              </div>

              <div className="space-y-2">
                {navItems.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center">
                    <input aria-label="Label"
                      type="text"
                      value={item.label}
                      onChange={(e) => {
                        const updated = [...navItems];
                        updated[idx].label = e.target.value;
                        setNavItems(updated);
                      }}
                      placeholder="Label"
                      className="col-span-5 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs"
                    />
                    <input aria-label="URL path (e.g. /products)"
                      type="text"
                      value={item.url}
                      onChange={(e) => {
                        const updated = [...navItems];
                        updated[idx].url = e.target.value;
                        setNavItems(updated);
                      }}
                      placeholder="URL path (e.g. /products)"
                      className="col-span-5 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs font-mono"
                    />
                    <button
                      onClick={() => setNavItems(navItems.filter((_, i) => i !== idx))}
                      className="col-span-2 text-center text-red-400 hover:text-red-300 text-xs font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Plus size={13} />}
                    onClick={() => setNavItems([...navItems, { id: `item_${Date.now()}`, label: 'New Link', url: '/', order: navItems.length }])}
                  >
                    Add Menu Link
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={saveNavMutation.isPending}
                    onClick={handleSaveNavItems}
                  >
                    Save Navigation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Mockup View */}
        <div className="lg:col-span-6 space-y-4">
          <div className="stat-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span>Live Preview Rendering</span>
              <span className="w-2 h-2 rounded-full bg-[#27C93F] animate-pulse" />
            </div>

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <button aria-label="Desktop preview"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded text-xs transition-colors ${previewDevice === 'desktop' ? 'bg-white/20 text-white' : 'text-muted'}`}
              >
                <Monitor size={14} />
              </button>
              <button aria-label="Mobile preview"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded text-xs transition-colors ${previewDevice === 'mobile' ? 'bg-white/20 text-white' : 'text-muted'}`}
              >
                <Smartphone size={14} />
              </button>
            </div>
          </div>

          {/* Storefront Mockup Frame */}
          <div className={`mx-auto transition duration-300 ${previewDevice === 'mobile' ? 'max-w-xs' : 'w-full'}`}>
            <div className="rounded-2xl border border-white/10 bg-[#0B0D1B] overflow-hidden shadow-2xl">
              {/* Dynamic Announcement Banner */}
              {sections.find(s => s.type === 'announcement')?.enabled && (
                <div
                  className="text-slate-950 text-[10px] font-bold py-1.5 px-3 text-center truncate"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {theme.bannerText}
                </div>
              )}

              {/* Dynamic Store Header */}
              {sections.find(s => s.type === 'header')?.enabled && (
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <span className="font-extrabold text-sm text-white tracking-tight">{store?.name || 'Aura Apparel'}</span>
                  <div className="flex items-center gap-3 text-xs text-secondary">
                    {navItems.slice(0, 3).map((link, idx) => (
                      <span key={idx}>{link.label}</span>
                    ))}
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">🛒 2</div>
                  </div>
                </div>
              )}

              {/* Dynamic Hero Banner */}
              {sections.find(s => s.type === 'hero')?.enabled && (
                <div className="p-8 text-center space-y-3 bg-gradient-to-b from-white/5 to-transparent border-b border-white/5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#FFBD2E]">New Collection 2026</span>
                  <h4 className="text-xl font-bold text-white" style={{ fontFamily: theme.fontFamily }}>
                    {sections.find(s => s.type === 'hero')?.settings?.title || 'Elevate Your Daily Style'}
                  </h4>
                  <p className="text-xs text-muted max-w-xs mx-auto">Crafted with sustainable fabrics and timeless minimalist cuts.</p>
                  <button
                    className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 transition-transform hover:scale-105"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {sections.find(s => s.type === 'hero')?.settings?.ctaText || 'Shop Summer Drop'} →
                  </button>
                </div>
              )}

              {/* Dynamic Product Cards */}
              {sections.find(s => s.type === 'featured-products')?.enabled && (
                <div className="p-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <div className="h-20 rounded-lg bg-white/10 flex items-center justify-center text-xs text-muted">Linen Blazer</div>
                    <span className="text-xs font-semibold text-white block">Linen Blazer</span>
                    <span className="text-xs font-bold" style={{ color: theme.accentColor }}>$149 USD</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <div className="h-20 rounded-lg bg-white/10 flex items-center justify-center text-xs text-muted">Leather Tote</div>
                    <span className="text-xs font-semibold text-white block">Leather Tote</span>
                    <span className="text-xs font-bold" style={{ color: theme.accentColor }}>$189 USD</span>
                  </div>
                </div>
              )}

              {/* Footer Section */}
              {sections.find(s => s.type === 'footer')?.enabled && (
                <div className="p-4 border-t border-white/10 text-center text-[10px] text-muted">
                  {sections.find(s => s.type === 'footer')?.settings?.copyright || '© 2026 Aura Apparel. All rights reserved.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
