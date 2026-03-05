import { createLogger } from '@shared/logger';
import { generateId } from '@shared/utils';
import type {
  FullScrapeResult,
  SyncManifest,
} from '@shared/types';

const log = createLogger('SupabaseSync');

export class SupabaseSync {
  async syncProject(data: FullScrapeResult): Promise<SyncManifest> {
    log.info('Starting Supabase sync', { projectName: data.projectName });

    const manifest: SyncManifest = {
      projectId: '',
      synced: [],
      failed: [],
      timestamp: Date.now(),
    };

    let supabase;
    try {
      // Dynamic import to avoid loading supabase when not needed
      const { getSupabase } = await import('@shared/supabase-client');
      supabase = await getSupabase();
    } catch (err) {
      log.error('Failed to initialize Supabase client', err);
      manifest.failed.push('supabase_init');
      return manifest;
    }

    // 1. Create or update the project record
    let projectId: string;
    try {
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('target_url', data.targetUrl)
        .eq('project_name', data.projectName)
        .single();

      if (existingProject) {
        projectId = existingProject.id;
        const { error } = await supabase
          .from('projects')
          .update({
            project_context: data.projectContext,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);

        if (error) throw error;
        log.info('Project record updated', { projectId });
      } else {
        projectId = generateId();
        const { error } = await supabase
          .from('projects')
          .insert({
            id: projectId,
            project_name: data.projectName,
            target_url: data.targetUrl,
            project_context: data.projectContext,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
        log.info('Project record created', { projectId });
      }

      manifest.projectId = projectId;
      manifest.synced.push('project');
    } catch (err) {
      log.error('Failed to sync project record', err);
      manifest.failed.push('project');
      return manifest;
    }

    // 2. Sync design tokens
    try {
      const { error } = await supabase
        .from('design_tokens')
        .upsert({
          project_id: projectId,
          colors: data.designTokens.colors,
          spacing: data.designTokens.spacing,
          shadows: data.designTokens.shadows,
          border_radii: data.designTokens.borderRadii,
          z_indices: data.designTokens.zIndices,
          opacities: data.designTokens.opacities,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id',
        });

      if (error) throw error;
      manifest.synced.push('design_tokens');
      log.info('Design tokens synced');
    } catch (err) {
      log.error('Failed to sync design tokens', err);
      manifest.failed.push('design_tokens');
    }

    // 3. Sync typography
    try {
      const { error } = await supabase
        .from('typography')
        .upsert({
          project_id: projectId,
          font_families: data.typography.fontFamilies,
          font_weights: data.typography.fontWeights,
          font_sizes: data.typography.fontSizes,
          line_heights: data.typography.lineHeights,
          letter_spacings: data.typography.letterSpacings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id',
        });

      if (error) throw error;
      manifest.synced.push('typography');
      log.info('Typography synced');
    } catch (err) {
      log.error('Failed to sync typography', err);
      manifest.failed.push('typography');
    }

    // 4. Sync components (batch insert)
    try {
      // Delete existing components for this project first
      await supabase
        .from('components')
        .delete()
        .eq('project_id', projectId);

      if (data.components.length > 0) {
        const componentRows = data.components.map(c => ({
          id: generateId(),
          project_id: projectId,
          name: c.name,
          selector: c.selector,
          type: c.type,
          html: c.html,
          css: c.css,
          state_variants: c.stateVariants,
          created_at: new Date().toISOString(),
        }));

        // Batch insert in chunks of 50 to avoid payload limits
        const chunkSize = 50;
        for (let i = 0; i < componentRows.length; i += chunkSize) {
          const chunk = componentRows.slice(i, i + chunkSize);
          const { error } = await supabase.from('components').insert(chunk);
          if (error) throw error;
        }
      }

      manifest.synced.push('components');
      log.info('Components synced', { count: data.components.length });
    } catch (err) {
      log.error('Failed to sync components', err);
      manifest.failed.push('components');
    }

    // 5. Upload screenshots to Supabase Storage
    try {
      for (const screenshot of data.screenshots) {
        const storagePath = `${projectId}/screenshots/viewport-${screenshot.breakpoint}px.png`;

        // Convert data URL to blob
        const response = await fetch(screenshot.dataUrl);
        const blob = await response.blob();

        const { error } = await supabase.storage
          .from('screenshots')
          .upload(storagePath, blob, {
            contentType: 'image/png',
            upsert: true,
          });

        if (error) {
          log.warn('Failed to upload screenshot', { breakpoint: screenshot.breakpoint, error });
        }
      }

      manifest.synced.push('screenshots');
      log.info('Screenshots uploaded', { count: data.screenshots.length });
    } catch (err) {
      log.error('Failed to sync screenshots', err);
      manifest.failed.push('screenshots');
    }

    // 6. Sync accessibility data
    try {
      const { error } = await supabase
        .from('accessibility_audits')
        .upsert({
          project_id: projectId,
          overall_score: data.accessibility.overallScore,
          wcag_level: data.accessibility.wcagLevel,
          contrast_issues: data.accessibility.contrastIssues,
          missing_alt_text: data.accessibility.missingAltText,
          missing_aria_labels: data.accessibility.missingAriaLabels,
          tab_order_issues: data.accessibility.tabOrderIssues,
          semantic_issues: data.accessibility.semanticIssues,
          focus_indicators_missing: data.accessibility.focusIndicatorsMissing,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id',
        });

      if (error) throw error;
      manifest.synced.push('accessibility');
      log.info('Accessibility data synced');
    } catch (err) {
      log.error('Failed to sync accessibility data', err);
      manifest.failed.push('accessibility');
    }

    // 7. Sync lighthouse data
    try {
      const { error } = await supabase
        .from('lighthouse_results')
        .upsert({
          project_id: projectId,
          performance_score: data.lighthouse.performanceScore,
          accessibility_score: data.lighthouse.accessibilityScore,
          lcp: data.lighthouse.lcp,
          cls: data.lighthouse.cls,
          inp: data.lighthouse.inp,
          fcp: data.lighthouse.fcp,
          speed_index: data.lighthouse.speedIndex,
          total_blocking_time: data.lighthouse.totalBlockingTime,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id',
        });

      if (error) throw error;
      manifest.synced.push('lighthouse');
      log.info('Lighthouse data synced');
    } catch (err) {
      log.error('Failed to sync lighthouse data', err);
      manifest.failed.push('lighthouse');
    }

    // 8. Sync navigation structure
    try {
      const { error } = await supabase
        .from('navigation')
        .upsert({
          project_id: projectId,
          primary_nav: data.navigation.primaryNav,
          footer_nav: data.navigation.footerNav,
          breadcrumbs: data.navigation.breadcrumbs,
          menu_depth: data.navigation.menuDepth,
          total_pages: data.navigation.totalPages,
          sitemap_tree: data.navigation.sitemapTree,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id',
        });

      if (error) throw error;
      manifest.synced.push('navigation');
      log.info('Navigation data synced');
    } catch (err) {
      log.error('Failed to sync navigation data', err);
      manifest.failed.push('navigation');
    }

    // 9. Sync third-party stack
    try {
      const { error } = await supabase
        .from('third_party_stack')
        .upsert({
          project_id: projectId,
          analytics: data.thirdPartyStack.analytics,
          cms: data.thirdPartyStack.cms,
          auth: data.thirdPartyStack.auth,
          payment: data.thirdPartyStack.payment,
          chat: data.thirdPartyStack.chat,
          cdns: data.thirdPartyStack.cdns,
          frameworks: data.thirdPartyStack.frameworks,
          ab_testing: data.thirdPartyStack.abTesting,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id',
        });

      if (error) throw error;
      manifest.synced.push('third_party_stack');
      log.info('Third-party stack synced');
    } catch (err) {
      log.error('Failed to sync third-party stack', err);
      manifest.failed.push('third_party_stack');
    }

    // 10. Sync conversion patterns
    try {
      const { error } = await supabase
        .from('conversion_patterns')
        .upsert({
          project_id: projectId,
          ctas: data.conversionPatterns.ctas,
          social_proof: data.conversionPatterns.socialProof,
          form_fields: data.conversionPatterns.formFields,
          urgency_patterns: data.conversionPatterns.urgencyPatterns,
          trust_badges: data.conversionPatterns.trustBadges,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id',
        });

      if (error) throw error;
      manifest.synced.push('conversion_patterns');
      log.info('Conversion patterns synced');
    } catch (err) {
      log.error('Failed to sync conversion patterns', err);
      manifest.failed.push('conversion_patterns');
    }

    // 11. Sync heatmap data
    if (data.heatmaps.length > 0) {
      try {
        await supabase
          .from('heatmaps')
          .delete()
          .eq('project_id', projectId);

        const heatmapRows = data.heatmaps.map(hm => ({
          id: generateId(),
          project_id: projectId,
          type: hm.type,
          source: hm.source,
          page_url: hm.pageUrl,
          data: hm.data,
          created_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from('heatmaps').insert(heatmapRows);
        if (error) throw error;

        manifest.synced.push('heatmaps');
        log.info('Heatmap data synced', { count: data.heatmaps.length });
      } catch (err) {
        log.error('Failed to sync heatmap data', err);
        manifest.failed.push('heatmaps');
      }
    }

    // 12. Sync wayback snapshots
    if (data.waybackSnapshots.length > 0) {
      try {
        await supabase
          .from('wayback_snapshots')
          .delete()
          .eq('project_id', projectId);

        const snapshotRows = data.waybackSnapshots.map(snap => ({
          id: generateId(),
          project_id: projectId,
          timestamp: snap.timestamp,
          url: snap.url,
          wayback_url: snap.waybackUrl,
          thumbnail: snap.thumbnail,
          key_changes: snap.keyChanges,
          created_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from('wayback_snapshots').insert(snapshotRows);
        if (error) throw error;

        manifest.synced.push('wayback_snapshots');
        log.info('Wayback snapshots synced', { count: data.waybackSnapshots.length });
      } catch (err) {
        log.error('Failed to sync wayback snapshots', err);
        manifest.failed.push('wayback_snapshots');
      }
    }

    log.info('Supabase sync complete', {
      projectId: manifest.projectId,
      synced: manifest.synced.length,
      failed: manifest.failed.length,
    });

    return manifest;
  }
}
