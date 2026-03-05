// =============================================================================
// UX KNOWLEDGE BASE MODULE
// =============================================================================
// Comprehensive embedded UX/UI design knowledge from authoritative sources.
// Exported as typed constants for use in prompt templates and analysis.
//
// Sources referenced:
//   - Nielsen Norman Group (Usability Heuristics)
//   - W3C WCAG 2.1 (Accessibility Guidelines)
//   - W3C Design Tokens Community Group (Token Specification)
//   - WAI-ARIA Authoring Practices Guide (Component Patterns)
//   - Inclusive Components by Heydon Pickering
//   - GOV.UK Design System
//   - Material Design, Carbon Design System, Primer Design System
// =============================================================================

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface UsabilityHeuristic {
  id: number;
  name: string;
  description: string;
  examples: string[];
  checkpoints: string[];
}

export interface UIPattern {
  name: string;
  category: 'navigation' | 'forms' | 'data-display' | 'feedback' | 'modals' | 'layout';
  description: string;
  whenToUse: string[];
  whenNotToUse: string[];
  accessibilityRequirements: string[];
  implementationChecklist: string[];
}

export interface WCAGGuideline {
  criterion: string;
  name: string;
  level: 'A' | 'AA';
  principle: 'perceivable' | 'operable' | 'understandable' | 'robust';
  description: string;
  testingMethod: string;
  commonFailures: string[];
}

export interface ComponentBlueprint {
  name: string;
  requiredStates: string[];
  ariaRequirements: string[];
  keyboardInteraction: string[];
  anatomy: string[];
  spacingGuidelines: string[];
  colorUsage: string[];
  dos: string[];
  donts: string[];
}

export interface DesignTokenCategory {
  name: string;
  description: string;
  tokens: { name: string; value: string; description: string }[];
}

export interface DesignTokenSpec {
  color: DesignTokenCategory;
  typography: DesignTokenCategory;
  spacing: DesignTokenCategory;
  sizing: DesignTokenCategory;
  border: DesignTokenCategory;
  shadow: DesignTokenCategory;
  opacity: DesignTokenCategory;
  zIndex: DesignTokenCategory;
  motion: DesignTokenCategory;
  breakpoints: DesignTokenCategory;
}

export interface SourceAuthority {
  tier: 'gold_standard' | 'authoritative' | 'reference' | 'example' | 'community';
  level: number;
  label: string;
  description: string;
  sources: string[];
  trustNotes: string;
}

export interface QualityCheck {
  id: string;
  category: string;
  check: string;
  rationale: string;
  severity: 'critical' | 'major' | 'minor';
  automated: boolean;
}

export interface InteractionPrinciple {
  name: string;
  category: string;
  description: string;
  guidelines: string[];
  specifications: Record<string, string>;
}

// =============================================================================
// 1. NIELSEN'S 10 USABILITY HEURISTICS
// =============================================================================
// Based on Jakob Nielsen's 10 general principles for interaction design.
// Each heuristic includes practical examples and evaluation checkpoints.
// =============================================================================

export const NIELSEN_HEURISTICS: UsabilityHeuristic[] = [
  {
    id: 1,
    name: 'Visibility of System Status',
    description:
      'The design should always keep users informed about what is going on, through appropriate feedback within a reasonable amount of time. When users know the current system status, they learn the outcome of their prior interactions and determine next steps.',
    examples: [
      'A progress bar during file upload shows percentage complete and estimated time remaining',
      'A shopping cart icon updates its badge count immediately when an item is added',
      'Form fields show inline validation success or error states as the user types',
      'A loading skeleton appears while content is being fetched from the server',
      'The current page is visually highlighted in the navigation menu',
    ],
    checkpoints: [
      'Does every user action produce visible, immediate feedback?',
      'Are loading states shown for any operation taking longer than 1 second?',
      'Do progress indicators exist for multi-step processes?',
      'Is the current location within the app always clear to the user?',
      'Are success and error states communicated clearly after form submission?',
    ],
  },
  {
    id: 2,
    name: 'Match Between System and the Real World',
    description:
      'The design should speak the users\' language. Use words, phrases, and concepts familiar to the user, rather than internal jargon. Follow real-world conventions, making information appear in a natural and logical order.',
    examples: [
      'An e-commerce site uses "Shopping Cart" and "Checkout" rather than "Order Buffer" or "Transaction Processor"',
      'A calendar app displays days in the conventional weekly grid format users expect',
      'A trash can icon is used for deleting items, mirroring the physical desktop metaphor',
      'A contact form uses labels like "Your Name" and "Your Email" instead of "Field_1" and "Field_2"',
      'A music player uses play, pause, and skip icons universally recognized from physical media players',
    ],
    checkpoints: [
      'Is all terminology user-facing rather than developer-facing or internal jargon?',
      'Do icons and metaphors match commonly understood real-world equivalents?',
      'Is information organized in a way that matches user mental models?',
      'Are units and formats localized to user expectations (date format, currency, measurements)?',
      'Have domain-specific terms been tested with actual users for comprehension?',
    ],
  },
  {
    id: 3,
    name: 'User Control and Freedom',
    description:
      'Users often perform actions by mistake. They need a clearly marked "emergency exit" to leave the unwanted action without having to go through an extended process. Support undo and redo.',
    examples: [
      'Gmail shows an "Undo Send" toast for several seconds after sending an email',
      'A text editor provides Ctrl+Z undo and Ctrl+Shift+Z redo for all editing actions',
      'A modal dialog includes a visible close button and can be dismissed with the Escape key',
      'A multi-step wizard includes a "Back" button on every step to revisit previous answers',
      'A photo editor has a "Revert to Original" option after applying filters or adjustments',
    ],
    checkpoints: [
      'Can users easily undo their most recent action?',
      'Is there always a clear way to go back or exit the current flow?',
      'Do confirmation dialogs protect against destructive or irreversible actions?',
      'Can users cancel long-running processes midway?',
      'Are exit points clearly visible without requiring extensive navigation?',
    ],
  },
  {
    id: 4,
    name: 'Consistency and Standards',
    description:
      'Users should not have to wonder whether different words, situations, or actions mean the same thing. Follow platform and industry conventions. Maintain internal consistency across the product.',
    examples: [
      'All primary action buttons use the same color, size, and placement throughout the application',
      'The term "Save" is used consistently rather than alternating with "Submit," "Store," or "Keep"',
      'Links are consistently styled with underline and a distinct color across all pages',
      'Form validation error messages always appear in the same position relative to the input field',
      'The header navigation and footer layout remain identical across every page of the site',
    ],
    checkpoints: [
      'Do similar elements look and behave the same way across the entire interface?',
      'Does the design follow established platform conventions (iOS HIG, Material Design, Web)?',
      'Is terminology used consistently throughout the product without synonyms?',
      'Are interaction patterns (click, swipe, drag) consistent for similar actions?',
      'Do visual styles (colors, typography, spacing) follow a defined design system?',
    ],
  },
  {
    id: 5,
    name: 'Error Prevention',
    description:
      'Good error messages are important, but the best designs carefully prevent problems from occurring in the first place. Either eliminate error-prone conditions, or check for them and present users with a confirmation option before they commit to the action.',
    examples: [
      'A date picker component prevents users from selecting invalid dates rather than accepting free text input',
      'A form disables the submit button until all required fields contain valid data',
      'A destructive action like "Delete Account" requires typing a confirmation phrase before proceeding',
      'Search fields offer autocomplete suggestions to prevent typos and guide correct input',
      'A character counter on a text area shows remaining characters before the user hits the limit',
    ],
    checkpoints: [
      'Are input constraints enforced through UI controls (pickers, sliders) rather than validation alone?',
      'Do destructive actions require explicit confirmation with clear description of consequences?',
      'Are sensible defaults provided for settings, form fields, and optional inputs?',
      'Does the system guard against common formatting errors (phone numbers, emails, dates)?',
      'Are users warned before navigating away from a page with unsaved changes?',
    ],
  },
  {
    id: 6,
    name: 'Recognition Rather Than Recall',
    description:
      'Minimize the user\'s memory load by making elements, actions, and options visible. The user should not have to remember information from one part of the interface to another. Information required to use the design should be visible or easily retrievable.',
    examples: [
      'A recently viewed items section shows products the user previously browsed for easy return',
      'Form fields include placeholder text showing the expected format (e.g., "MM/DD/YYYY")',
      'A rich text editor toolbar shows formatting options as visible icons rather than requiring keyboard shortcut memorization',
      'An autocomplete dropdown shows matching options as the user types to aid recognition',
      'Dashboard filters remain visible and show their currently selected values at all times',
    ],
    checkpoints: [
      'Are the most common actions visible and easily accessible without memorization?',
      'Do menus and option lists show full labels rather than requiring users to remember codes or IDs?',
      'Is contextual help available at the point of need rather than requiring a separate lookup?',
      'Are recently used or frequently accessed items surfaced prominently?',
      'Can users see their previous selections and inputs at each step of a multi-step process?',
    ],
  },
  {
    id: 7,
    name: 'Flexibility and Efficiency of Use',
    description:
      'Shortcuts, hidden from novice users, can speed up the interaction for the expert user so that the design can cater to both inexperienced and experienced users. Allow users to tailor frequent actions.',
    examples: [
      'Keyboard shortcuts are available for power users (e.g., Ctrl+K for command palette)',
      'An application supports both drag-and-drop and manual file selection for uploads',
      'A search feature offers both simple keyword search and advanced filter query syntax',
      'Users can create saved templates or presets for repetitive configuration tasks',
      'A text editor supports both toolbar buttons and markdown syntax for formatting',
    ],
    checkpoints: [
      'Are keyboard shortcuts available for the most frequent actions?',
      'Can experienced users bypass or accelerate common workflows?',
      'Are there multiple ways to accomplish the same task (mouse, keyboard, touch)?',
      'Can users customize or personalize the interface for their specific workflow?',
      'Do accelerators exist without hindering or confusing the novice experience?',
    ],
  },
  {
    id: 8,
    name: 'Aesthetic and Minimalist Design',
    description:
      'Interfaces should not contain information which is irrelevant or rarely needed. Every extra unit of information in an interface competes with the relevant units of information and diminishes their relative visibility.',
    examples: [
      'A checkout page shows only the fields necessary for completing the purchase with nothing extraneous',
      'A dashboard highlights key metrics above the fold with detailed data available on drill-down',
      'A landing page uses generous whitespace to draw attention to the primary call-to-action',
      'Progressive disclosure hides advanced settings behind an "Advanced Options" expandable section',
      'A mobile app uses a bottom navigation with only the 4-5 most important sections visible',
    ],
    checkpoints: [
      'Does every visible element on the screen serve a clear, identifiable purpose?',
      'Has secondary or rarely-needed content been deprioritized via progressive disclosure?',
      'Is whitespace used effectively to create visual hierarchy and reduce cognitive load?',
      'Are there elements that could be removed without negatively affecting the user experience?',
      'Is the visual design free of purely decorative elements that compete with functional content?',
    ],
  },
  {
    id: 9,
    name: 'Help Users Recognize, Diagnose, and Recover from Errors',
    description:
      'Error messages should be expressed in plain language (no error codes), precisely indicate the problem, and constructively suggest a solution.',
    examples: [
      '"The password must be at least 8 characters and include a number" instead of "Error: Invalid input"',
      'A 404 page includes a search bar and links to popular pages rather than only showing "Page Not Found"',
      'A form highlights the specific field with an error and places the error message directly adjacent to it',
      'A payment failure explains "Your card was declined. Please check your card number or try a different payment method."',
      'An API timeout error offers a "Retry" button alongside an explanation that the server is temporarily unavailable',
    ],
    checkpoints: [
      'Are error messages written in plain, non-technical language that any user can understand?',
      'Do error messages precisely identify what went wrong rather than being generic?',
      'Do error messages offer a constructive, actionable suggestion for resolution?',
      'Are errors displayed close to the source of the problem (inline, not only at page top)?',
      'Do error states provide a clear path to recovery (retry button, alternative action, help link)?',
    ],
  },
  {
    id: 10,
    name: 'Help and Documentation',
    description:
      'It is best if the system can be used without documentation, but it may be necessary to provide help and documentation. Any such information should be easy to search, focused on the user\'s task, list concrete steps to be carried out, and not be too large.',
    examples: [
      'Contextual tooltips appear when hovering over complex features or unfamiliar icons',
      'A searchable help center is accessible from every page via a persistent question mark icon',
      'An onboarding tour highlights key features step-by-step when a user first logs in',
      'Inline help text appears below form fields to explain what input format is expected',
      'A chatbot provides context-aware assistance based on the current page the user is viewing',
    ],
    checkpoints: [
      'Is help documentation easy to search and navigate with clear categories?',
      'Is contextual help available at the point of need rather than only in a separate help section?',
      'Does onboarding guide new users through key features without overwhelming them?',
      'Are help resources focused on user tasks rather than exhaustive feature-by-feature descriptions?',
      'Can users access help without leaving their current workflow or losing their place?',
    ],
  },
];

// =============================================================================
// 2. UI PATTERN LIBRARY (30+ patterns)
// =============================================================================
// Organized by category: Navigation, Forms, Data Display, Feedback, Modals, Layout.
// Each pattern includes usage guidance, anti-patterns, accessibility, and implementation notes.
// =============================================================================

export const UI_PATTERNS: UIPattern[] = [
  // ---------------------------------------------------------------------------
  // NAVIGATION PATTERNS
  // ---------------------------------------------------------------------------
  {
    name: 'Tabs',
    category: 'navigation',
    description: 'Horizontal or vertical tabbed interface that organizes content into mutually exclusive panels, allowing users to switch between views without leaving the page.',
    whenToUse: [
      'Content can be logically divided into 2-7 discrete, parallel categories',
      'Users need to compare or switch between related data sets',
      'Screen real estate is limited and only one section needs to be visible at a time',
    ],
    whenNotToUse: [
      'Content in different tabs is sequential or dependent on previous tabs',
      'There are more than 7 tabs (consider a different navigation pattern)',
      'Users need to see content from multiple tabs simultaneously',
    ],
    accessibilityRequirements: [
      'Tab list uses role="tablist", each tab uses role="tab", each panel uses role="tabpanel"',
      'Active tab has aria-selected="true", inactive tabs have aria-selected="false"',
      'Each tab has aria-controls pointing to its panel id',
      'Arrow keys navigate between tabs; Tab key moves focus into the active panel',
      'Home/End keys jump to first/last tab',
    ],
    implementationChecklist: [
      'Implement ARIA tablist pattern with proper roles',
      'Support arrow key navigation between tabs',
      'Visually distinguish active tab from inactive tabs',
      'Ensure tab panels are lazy-loaded or pre-rendered based on use case',
      'Handle overflow with horizontal scroll or "more" dropdown for many tabs',
      'Consider converting to accordion on mobile viewports',
    ],
  },
  {
    name: 'Breadcrumbs',
    category: 'navigation',
    description: 'A secondary navigation aid showing the user\'s current location within the site hierarchy and providing links back to parent pages.',
    whenToUse: [
      'Site has a deep hierarchical structure with 3+ levels',
      'Users may arrive at deep pages via search or external links',
      'Users need a way to navigate up the hierarchy without using the back button',
    ],
    whenNotToUse: [
      'Site has a flat structure with no meaningful hierarchy',
      'There is only one path to every page (linear flow)',
      'The site has fewer than 3 levels of depth',
    ],
    accessibilityRequirements: [
      'Wrap in a <nav> element with aria-label="Breadcrumb"',
      'Use an ordered list (<ol>) to convey the sequential hierarchy',
      'Current page item uses aria-current="page"',
      'Separator characters are decorative and hidden from screen readers with aria-hidden="true"',
    ],
    implementationChecklist: [
      'Use semantic <nav> with aria-label="Breadcrumb"',
      'Render as ordered list for correct hierarchy semantics',
      'Make all items except the current page clickable links',
      'Truncate middle items with ellipsis on mobile if the path is very long',
      'Ensure separators are purely visual (CSS pseudo-elements or aria-hidden)',
    ],
  },
  {
    name: 'Sidebar Navigation',
    category: 'navigation',
    description: 'Vertical navigation panel along the left or right side of the page, often collapsible, showing primary and secondary navigation links.',
    whenToUse: [
      'Application has many navigation sections (8+ items) that do not fit in a top bar',
      'Users need persistent access to navigation while working in content areas',
      'The application is a dashboard or tool with deep feature hierarchy',
    ],
    whenNotToUse: [
      'The site is a simple marketing page with few sections',
      'Content width is critical and sidebar would reduce usable space on small screens',
      'Users primarily navigate linearly through content (articles, docs)',
    ],
    accessibilityRequirements: [
      'Wrap in <nav> with a descriptive aria-label (e.g., "Main navigation")',
      'Active item marked with aria-current="page"',
      'Collapsible sections use aria-expanded on their toggle buttons',
      'Collapsed sidebar must remain accessible via keyboard and screen readers',
    ],
    implementationChecklist: [
      'Implement collapsible/expandable sidebar with smooth transition',
      'Show icons with text labels; icon-only mode requires tooltips',
      'Highlight the currently active section and page',
      'Support nested navigation groups with expandable sub-menus',
      'On mobile, convert to overlay drawer or bottom sheet',
      'Persist collapsed/expanded state in user preferences',
    ],
  },
  {
    name: 'Mega Menu',
    category: 'navigation',
    description: 'A large dropdown panel that expands from the main navigation to show multiple categories, links, and optional featured content in a structured grid layout.',
    whenToUse: [
      'Site has many categories with subcategories (e-commerce, large content sites)',
      'Users need to see all navigation options at a glance to choose efficiently',
      'There are enough items to warrant visual organization beyond a simple dropdown',
    ],
    whenNotToUse: [
      'There are fewer than 15-20 navigation items total',
      'The site targets primarily mobile users where mega menus are impractical',
      'Content changes frequently and the menu would need constant updates',
    ],
    accessibilityRequirements: [
      'Trigger button uses aria-expanded to indicate open/close state',
      'Menu panel uses role="menu" or a describable region with aria-label',
      'Arrow keys navigate between items; Escape closes the menu',
      'Focus is managed: first item receives focus on open, focus returns to trigger on close',
      'Sub-groups use headings or role="group" with aria-label for categorization',
    ],
    implementationChecklist: [
      'Open on hover (desktop) with a small delay (200-300ms) to prevent accidental triggers',
      'Support click-to-open as alternative and primary method on touch devices',
      'Organize items into visually distinct columns with category headings',
      'Include a close button visible within the panel',
      'Trap focus within the menu when opened via keyboard',
      'On mobile, convert to a full-screen or accordion-based menu',
    ],
  },
  {
    name: 'Hamburger Menu',
    category: 'navigation',
    description: 'A three-line icon button that toggles visibility of the main navigation, commonly used on mobile viewports or minimalist desktop designs.',
    whenToUse: [
      'Mobile viewport where there is insufficient space for full navigation',
      'The design intentionally prioritizes content over persistent navigation',
      'As a progressive enhancement when the full nav is shown on larger screens',
    ],
    whenNotToUse: [
      'Desktop designs where space allows for visible navigation (discoverability suffers)',
      'Critical navigation items that users need constant access to',
      'When there are only 3-4 navigation items that could fit in a visible bar',
    ],
    accessibilityRequirements: [
      'Button has aria-label="Open menu" or "Close menu" reflecting current state',
      'Button uses aria-expanded="true"/"false" to indicate menu visibility',
      'Button uses aria-controls pointing to the menu element id',
      'Menu receives focus when opened; focus returns to button when closed',
      'Escape key closes the menu',
    ],
    implementationChecklist: [
      'Use a <button> element, never a <div> or <span>',
      'Animate the icon transition between hamburger and close (X) states',
      'Implement as an overlay or slide-in drawer on mobile',
      'Ensure the menu content is not in the tab order when hidden',
      'Trap focus within the open menu on mobile',
      'Consider a semi-transparent backdrop overlay when menu is open',
    ],
  },
  // ---------------------------------------------------------------------------
  // FORM PATTERNS
  // ---------------------------------------------------------------------------
  {
    name: 'Inline Validation',
    category: 'forms',
    description: 'Real-time validation feedback displayed adjacent to form fields as the user fills them in, rather than waiting until form submission.',
    whenToUse: [
      'Fields have specific format requirements (email, phone, password strength)',
      'Preventing errors early reduces user frustration on long or complex forms',
      'Users benefit from immediate confirmation that their input is valid',
    ],
    whenNotToUse: [
      'Very simple forms with 1-2 fields where validation on submit is sufficient',
      'Fields that require server-side validation and would cause excessive API calls',
      'When showing errors before the user has finished typing would be annoying (validate on blur instead)',
    ],
    accessibilityRequirements: [
      'Error messages linked to fields via aria-describedby',
      'Invalid fields marked with aria-invalid="true"',
      'Error messages use role="alert" or are in an aria-live region for screen reader announcement',
      'Success states are not solely communicated through color (add icon or text)',
    ],
    implementationChecklist: [
      'Validate on blur (field exit) rather than on every keystroke for text fields',
      'For password fields, validate on keyup with debounce to show strength in real time',
      'Display error messages below or beside the field, consistently positioned',
      'Use red/error color for invalid state and green/success for valid state',
      'Include a descriptive error message, not just a color change or icon',
      'Announce errors to screen readers via aria-live or role="alert"',
    ],
  },
  {
    name: 'Multi-Step Form (Wizard)',
    category: 'forms',
    description: 'A form broken into sequential steps with a progress indicator, reducing cognitive load by presenting a manageable amount of input per step.',
    whenToUse: [
      'Form has more than 8-10 fields that can be logically grouped',
      'The process has distinct phases (e.g., personal info, payment, review)',
      'Users may need to complete the form over multiple sessions',
    ],
    whenNotToUse: [
      'The form is short enough to display on a single screen without scrolling',
      'Users need to see and compare all fields simultaneously',
      'Steps are not logically independent (changing step 3 would invalidate step 1)',
    ],
    accessibilityRequirements: [
      'Progress indicator conveys current step via aria-valuenow, aria-valuemin, aria-valuemax',
      'Each step is announced to screen readers when navigated to',
      'Back and Next buttons are clearly labeled and keyboard accessible',
      'Form data is preserved when navigating between steps',
    ],
    implementationChecklist: [
      'Display a visual progress indicator (stepper bar) showing all steps and current position',
      'Include "Back" and "Next" navigation buttons on every step',
      'Validate the current step before allowing progression to the next',
      'Save form state to prevent data loss on accidental navigation or page refresh',
      'Show a summary/review step before final submission',
      'Allow users to click completed steps in the progress bar to jump back',
    ],
  },
  {
    name: 'Auto-Save',
    category: 'forms',
    description: 'Automatic periodic saving of form data or document edits without requiring the user to explicitly click a save button.',
    whenToUse: [
      'Users are creating or editing long-form content (documents, articles, posts)',
      'Data loss from accidental navigation or browser crash would be very costly',
      'The workflow involves frequent small changes over extended sessions',
    ],
    whenNotToUse: [
      'Changes should only be committed after explicit review (financial forms, legal docs)',
      'Auto-saving partial data could cause data integrity issues',
      'The form is a simple short submission (contact form, login)',
    ],
    accessibilityRequirements: [
      'Save status is displayed in text (not just a spinner icon) accessible to screen readers',
      'Status region uses aria-live="polite" so save confirmations are announced without interrupting',
      'Any error in saving is announced with aria-live="assertive"',
    ],
    implementationChecklist: [
      'Save data on a debounced timer (e.g., 2-3 seconds after last change)',
      'Also save on blur (when user leaves a field) and on page visibility change',
      'Display a subtle status indicator: "Saving...", "Saved", "Error saving"',
      'Implement conflict resolution if multiple sessions can edit simultaneously',
      'Store drafts locally (localStorage) as a fallback in case network save fails',
      'Provide a manual save trigger as a fallback for users who prefer explicit control',
    ],
  },
  {
    name: 'Progressive Disclosure Form',
    category: 'forms',
    description: 'A form that reveals additional fields based on prior user selections, showing only what is relevant at each point to reduce initial complexity.',
    whenToUse: [
      'Different user paths require different sets of fields (e.g., individual vs. business account)',
      'The full form would be overwhelmingly long if shown at once',
      'Some fields are only applicable based on answers to earlier questions',
    ],
    whenNotToUse: [
      'All fields are always required regardless of user choices',
      'Users need to see the entire form scope before starting (to estimate time or gather info)',
      'The conditional logic is so complex it would confuse users about what they missed',
    ],
    accessibilityRequirements: [
      'Newly revealed fields are announced to screen readers (aria-live region or focus management)',
      'Hidden fields are truly removed from the DOM or have aria-hidden="true" and tabindex="-1"',
      'The trigger control (radio, select, checkbox) clearly indicates that it controls additional content',
    ],
    implementationChecklist: [
      'Use conditional rendering to show/hide field groups based on selection',
      'Animate the reveal with a smooth expand transition for spatial context',
      'Move focus to the first newly revealed field after expansion',
      'Clear values of hidden fields to prevent submitting stale data',
      'Test all permutations of conditional paths',
      'Ensure the form is still usable if JavaScript fails (progressive enhancement)',
    ],
  },
  // ---------------------------------------------------------------------------
  // DATA DISPLAY PATTERNS
  // ---------------------------------------------------------------------------
  {
    name: 'Data Table',
    category: 'data-display',
    description: 'A structured grid of rows and columns for displaying tabular data, with features like sorting, filtering, pagination, and row selection.',
    whenToUse: [
      'Data has multiple attributes per item that users need to compare across rows',
      'Users need to sort, filter, or search within the data set',
      'The data set has a defined schema with consistent columns',
    ],
    whenNotToUse: [
      'Items have very few attributes (1-2 fields) where a simple list suffices',
      'The data is primarily visual (images, charts) rather than textual/numeric',
      'The audience is primarily mobile and the table has many columns',
    ],
    accessibilityRequirements: [
      'Use semantic <table>, <thead>, <tbody>, <th>, <td> elements',
      'Column headers use scope="col", row headers use scope="row"',
      'Sortable columns indicate sort state with aria-sort="ascending"/"descending"/"none"',
      'Pagination controls are keyboard accessible with clear aria-labels',
      'Selected rows use aria-selected="true"',
    ],
    implementationChecklist: [
      'Implement sortable column headers with visual sort indicators',
      'Add pagination or virtual scrolling for large data sets',
      'Support column resizing and reordering where applicable',
      'Provide an empty state message when no data matches filters',
      'On mobile, use horizontal scrolling with a sticky first column, or reflow to card layout',
      'Include a loading/skeleton state for async data fetching',
    ],
  },
  {
    name: 'Card Layout',
    category: 'data-display',
    description: 'Content organized into discrete, self-contained cards, each representing a single entity with an image, title, description, and optional actions.',
    whenToUse: [
      'Items are visually rich with images or thumbnails',
      'Each item has multiple attributes but does not need column-based comparison',
      'Users are browsing and exploring rather than doing detailed comparison',
    ],
    whenNotToUse: [
      'Users need to compare specific attributes across many items (use a table)',
      'Items have no visual element and are purely textual (use a list)',
      'Screen density is critical and cards waste too much space',
    ],
    accessibilityRequirements: [
      'If the entire card is clickable, use a single link/button wrapping the card or use a click handler with role and keyboard support',
      'Images within cards have descriptive alt text',
      'Card headings use proper heading levels in document order',
      'Interactive elements within cards are individually focusable and operable',
    ],
    implementationChecklist: [
      'Use CSS Grid or Flexbox for responsive card grid layout',
      'Ensure consistent card height within rows (consider aspect-ratio for images)',
      'Include hover and focus states for interactive cards',
      'Lazy-load card images that are below the fold',
      'Provide a skeleton loading state matching the card dimensions',
      'Support list/grid view toggle if users may prefer a compact view',
    ],
  },
  {
    name: 'List View',
    category: 'data-display',
    description: 'A vertical list of items, each displaying key information in a single row, optimized for scanning and quick access to details.',
    whenToUse: [
      'Items are text-heavy with a clear title and supporting metadata',
      'Users need to scan a large number of items quickly',
      'The interface is used primarily on mobile where horizontal space is limited',
    ],
    whenNotToUse: [
      'Items are primarily visual and benefit from larger image display (use cards)',
      'Users need to compare multiple attributes side by side (use a table)',
      'There are very few items (3-5) that could be shown in a more engaging layout',
    ],
    accessibilityRequirements: [
      'Use semantic <ul>/<ol> with <li> elements for proper list semantics',
      'If items are interactive, ensure each is a focusable link or button',
      'Selection state indicated with aria-selected on list items',
      'List has an accessible name via aria-label or a visible heading associated with aria-labelledby',
    ],
    implementationChecklist: [
      'Display consistent metadata per row (title, description, date, status)',
      'Support item selection (single or multi-select) if applicable',
      'Include hover and focus visual states for interactive items',
      'Implement virtual scrolling for lists with 100+ items',
      'Provide keyboard shortcuts for navigation (arrow keys for items)',
      'Include an empty state with guidance when the list has no items',
    ],
  },
  {
    name: 'Infinite Scroll',
    category: 'data-display',
    description: 'Automatically loading additional content as the user scrolls toward the bottom of the page, creating a seamless continuous browsing experience.',
    whenToUse: [
      'Content is discovery-oriented (social feeds, image galleries, news feeds)',
      'Users are casually browsing rather than searching for a specific item',
      'The total data set is very large and page numbers would be meaningless',
    ],
    whenNotToUse: [
      'Users need to reach the footer (which becomes inaccessible with infinite scroll)',
      'Users need to find specific items by position or page (search results with rankings)',
      'The content has a defined end that users should be aware of',
      'SEO is critical and all content must be indexable',
    ],
    accessibilityRequirements: [
      'New content is announced to screen readers with an aria-live region',
      'A "Load more" button alternative is provided for users who prefer explicit control',
      'Focus management ensures keyboard users can navigate newly loaded content',
      'The loading indicator is accessible and announced (role="status")',
    ],
    implementationChecklist: [
      'Use Intersection Observer API to detect when the user approaches the bottom',
      'Show a loading spinner or skeleton below existing content while fetching',
      'Implement a "Load more" button as a fallback and for accessibility',
      'Maintain scroll position if the user navigates away and returns (scroll restoration)',
      'Include an "End of results" message when all content has been loaded',
      'Consider adding a "Back to top" button for long scrolling sessions',
    ],
  },
  {
    name: 'Pagination',
    category: 'data-display',
    description: 'Dividing content into discrete numbered pages with navigation controls to move between them.',
    whenToUse: [
      'Users are searching for specific items and need to know the total result count',
      'Content has a defined total size and users may want to jump to specific positions',
      'The footer contains important information that must remain accessible',
      'SEO requires distinct URLs for each page of content',
    ],
    whenNotToUse: [
      'Content is discovery-oriented with no defined order (use infinite scroll)',
      'The data set is very small (under 20 items that fit on one page)',
      'Users rarely go beyond the first page (optimize the first page instead)',
    ],
    accessibilityRequirements: [
      'Wrap in a <nav> element with aria-label="Pagination"',
      'Current page marked with aria-current="page"',
      'Disabled prev/next buttons use aria-disabled="true"',
      'Each page link has an accessible label (e.g., "Page 3" not just "3")',
    ],
    implementationChecklist: [
      'Show first, last, previous, next, and current page with surrounding pages',
      'Use ellipsis for gaps in large page ranges',
      'Include "items per page" selector if applicable',
      'Display total item count and current range ("Showing 21-40 of 200")',
      'Update URL parameters for bookmarkable page states',
      'Scroll to top of content area after page change',
    ],
  },
  {
    name: 'Skeleton Loading',
    category: 'data-display',
    description: 'Placeholder UI that mimics the layout structure of the content being loaded, providing a visual preview of the page structure before data arrives.',
    whenToUse: [
      'Content layout is predictable and consistent (cards, lists, profiles)',
      'Loading time is between 0.5 and 3 seconds',
      'The perceived performance benefit outweighs implementation cost',
    ],
    whenNotToUse: [
      'Content layout is unpredictable or highly dynamic',
      'Loading completes in under 300ms (skeleton flash is more jarring than no skeleton)',
      'The content type does not have a meaningful shape to preview (raw text)',
    ],
    accessibilityRequirements: [
      'Skeleton elements have aria-hidden="true" since they convey no real content',
      'The loading region has aria-busy="true" while loading',
      'A text-based loading announcement uses aria-live="polite" for screen readers',
      'Skeleton animations respect prefers-reduced-motion media query',
    ],
    implementationChecklist: [
      'Match skeleton shapes to the actual content layout (rectangles for text, circles for avatars)',
      'Use a subtle shimmer or pulse animation to indicate loading (not static gray boxes)',
      'Show skeleton for a minimum of 300ms to avoid a flash',
      'Transition smoothly from skeleton to real content (fade in)',
      'Implement at the component level so individual components can show their own skeleton',
      'Respect prefers-reduced-motion by replacing animation with static gray',
    ],
  },
  // ---------------------------------------------------------------------------
  // FEEDBACK PATTERNS
  // ---------------------------------------------------------------------------
  {
    name: 'Toast Notification',
    category: 'feedback',
    description: 'A brief, auto-dismissing message that appears at the edge of the screen to confirm an action or communicate a non-critical status update.',
    whenToUse: [
      'Confirming that a user action succeeded (item saved, message sent)',
      'Communicating non-critical information that does not require a response',
      'Providing an undo opportunity for a recently completed action',
    ],
    whenNotToUse: [
      'The message requires user acknowledgment or decision (use a dialog)',
      'The information is critical and must not be missed (use an inline alert or modal)',
      'Multiple toasts would stack and overwhelm the user',
    ],
    accessibilityRequirements: [
      'Use role="status" for informational toasts, role="alert" for warnings/errors',
      'Content must be announced by screen readers via aria-live region',
      'Auto-dismiss duration must be at least 5 seconds to allow reading',
      'Include a visible dismiss button for users who want to remove it immediately',
      'Toast must not obscure important interactive elements',
    ],
    implementationChecklist: [
      'Position consistently (bottom-center, top-right) across the application',
      'Stack multiple toasts vertically with newest at the top or bottom consistently',
      'Include dismiss button (X) and optional action button (Undo)',
      'Auto-dismiss after 5-8 seconds for info; do NOT auto-dismiss errors',
      'Animate entrance (slide in) and exit (fade out) with 200-300ms transitions',
      'Limit maximum visible toasts to 3-5 to prevent overload',
    ],
  },
  {
    name: 'Progress Indicator',
    category: 'feedback',
    description: 'Visual representation of the completion status of a task or process, either as a determinate bar (known progress) or indeterminate spinner (unknown duration).',
    whenToUse: [
      'An operation takes more than 1 second to complete',
      'The user needs assurance that the system is working and has not frozen',
      'Progress percentage or steps can be calculated and shown',
    ],
    whenNotToUse: [
      'The operation completes in under 1 second (the indicator would flash and distract)',
      'Inline skeleton loading better represents the spatial layout of incoming content',
    ],
    accessibilityRequirements: [
      'Use role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax for determinate',
      'Indeterminate spinners need an aria-label describing what is loading',
      'Progress updates announced to screen readers via aria-live="polite"',
      'Animations respect prefers-reduced-motion',
    ],
    implementationChecklist: [
      'Use determinate progress bars when the total work is known',
      'Use indeterminate spinners only when progress cannot be calculated',
      'Show percentage or step count alongside the visual bar',
      'For multi-step processes, show a stepper with labeled steps',
      'Consider adding estimated time remaining for long operations',
      'Provide a cancel button for operations that can be aborted',
    ],
  },
  {
    name: 'Empty State',
    category: 'feedback',
    description: 'The UI displayed when a section or page has no content to show, providing guidance and next actions rather than a blank screen.',
    whenToUse: [
      'A list, table, or section has zero items (first use, filtered results, cleared data)',
      'A search returns no results',
      'A feature has not been set up or configured yet',
    ],
    whenNotToUse: [
      'Content is loading (show skeleton/spinner instead)',
      'The section is intentionally empty and needs no explanation',
    ],
    accessibilityRequirements: [
      'Empty state text is readable by screen readers (not just decorative illustration)',
      'Action buttons within the empty state are keyboard accessible and properly labeled',
      'If an illustration is used, it has an appropriate alt text or is aria-hidden if purely decorative',
    ],
    implementationChecklist: [
      'Include a clear, friendly message explaining why there is nothing to show',
      'Add an illustration or icon to make the state visually distinct and less stark',
      'Provide a primary action button guiding the user to the next step (e.g., "Create your first project")',
      'For search empty states, suggest alternative queries or show popular items',
      'Differentiate between "no data yet" and "no results for this filter"',
      'Ensure the empty state is responsive and centered properly on all viewports',
    ],
  },
  {
    name: 'Error State',
    category: 'feedback',
    description: 'The UI displayed when a page or component fails to load or encounters an error, providing clear information about the problem and recovery options.',
    whenToUse: [
      'A network request fails and content cannot be displayed',
      'A page or resource is not found (404)',
      'A server error occurs (500) during a critical operation',
    ],
    whenNotToUse: [
      'Field-level validation errors (use inline validation instead)',
      'Transient issues that can be silently retried without user awareness',
    ],
    accessibilityRequirements: [
      'Error message is announced to screen readers via aria-live="assertive" or role="alert"',
      'Recovery actions (retry, go home) are keyboard accessible',
      'Error icon is supplemented with text; do not rely on icon or color alone',
    ],
    implementationChecklist: [
      'Display a clear, human-readable error message without technical jargon',
      'Include a "Retry" button for network or transient errors',
      'Provide alternative navigation (go home, go back, contact support)',
      'Log the error details for debugging (console or error tracking service)',
      'Use a consistent error page layout across the application',
      'For partial failures, show the parts that succeeded and indicate what failed',
    ],
  },
  // ---------------------------------------------------------------------------
  // MODAL PATTERNS
  // ---------------------------------------------------------------------------
  {
    name: 'Confirmation Dialog',
    category: 'modals',
    description: 'A modal dialog that asks the user to confirm or cancel a significant or destructive action before it is executed.',
    whenToUse: [
      'The action is destructive and irreversible (delete, discard, overwrite)',
      'The action has significant consequences (sending email to many recipients, publishing)',
      'Users might have triggered the action accidentally',
    ],
    whenNotToUse: [
      'The action is easily reversible with undo functionality',
      'The action is routine and low-risk (saving, copying)',
      'Overuse would cause "dialog fatigue" where users auto-click confirm without reading',
    ],
    accessibilityRequirements: [
      'Uses role="alertdialog" with aria-labelledby and aria-describedby',
      'Focus is trapped within the dialog while open',
      'Escape key dismisses the dialog (equivalent to cancel)',
      'Focus returns to the triggering element when the dialog closes',
      'Destructive action button is clearly distinguished from the cancel button',
    ],
    implementationChecklist: [
      'State the action and its consequences clearly in the dialog body',
      'Use a descriptive action button label (e.g., "Delete project" not just "OK")',
      'Make the safe action (Cancel) visually prominent; make the destructive action secondary or danger-styled',
      'Never use "Yes/No" labels; use verbs that describe the action',
      'For critical deletions, require typing a confirmation phrase',
      'Ensure the dialog cannot be dismissed by clicking the backdrop for destructive actions',
    ],
  },
  {
    name: 'Drawer / Slide-Out Panel',
    category: 'modals',
    description: 'A panel that slides in from the edge of the screen (typically right or left), overlaying the main content to show secondary information or forms.',
    whenToUse: [
      'Displaying details of a selected item without leaving the current page context',
      'Editing properties or settings related to the current view',
      'Shopping cart, filter panels, or notification centers',
    ],
    whenNotToUse: [
      'The content in the drawer is a primary workflow that deserves its own page',
      'The drawer would be used so frequently it should be a persistent sidebar instead',
      'The content is a simple confirmation that could use a smaller dialog',
    ],
    accessibilityRequirements: [
      'Uses role="dialog" with aria-labelledby and aria-modal="true"',
      'Focus is trapped within the drawer while open',
      'Escape key closes the drawer',
      'Focus returns to the trigger element on close',
      'Backdrop click closes the drawer (with confirmation if data would be lost)',
    ],
    implementationChecklist: [
      'Animate slide-in from the edge (300ms ease-out)',
      'Include a visible close button in the drawer header',
      'Add a semi-transparent backdrop overlay behind the drawer',
      'Set a max-width (e.g., 400-600px) so the drawer does not cover the entire screen',
      'On mobile, the drawer may take the full screen width',
      'Handle scroll independently within the drawer (drawer scrolls, page does not)',
    ],
  },
  {
    name: 'Popover',
    category: 'modals',
    description: 'A small floating panel anchored to a trigger element, displaying supplementary content or controls without navigating away from the current context.',
    whenToUse: [
      'Showing additional options or details related to a specific element',
      'Compact filter or date picker controls',
      'Rich content that does not fit in a tooltip but does not warrant a full modal',
    ],
    whenNotToUse: [
      'Showing simple, one-line help text (use a tooltip instead)',
      'Content that requires scrolling or a lot of interaction (use a drawer or modal)',
      'On mobile where small floating panels are hard to interact with',
    ],
    accessibilityRequirements: [
      'Trigger uses aria-expanded to indicate open/close state',
      'Trigger uses aria-controls pointing to the popover element id',
      'Popover content is focusable and in a logical tab order',
      'Escape key closes the popover and returns focus to trigger',
      'Clicking outside the popover closes it',
    ],
    implementationChecklist: [
      'Position dynamically relative to the trigger (use a positioning library like Floating UI)',
      'Handle viewport edge cases (flip to opposite side if not enough space)',
      'Add a subtle box shadow to elevate the popover above the page',
      'Include a small arrow/caret pointing to the trigger element',
      'Close on outside click and Escape key',
      'Ensure popover does not render off-screen or get clipped by overflow:hidden containers',
    ],
  },
  {
    name: 'Tooltip',
    category: 'modals',
    description: 'A small text label that appears on hover or focus to describe an element, providing supplementary information without cluttering the interface.',
    whenToUse: [
      'An icon button needs a text label to explain its function',
      'A truncated text string needs to show its full content on hover',
      'A form field or setting needs a brief clarification',
    ],
    whenNotToUse: [
      'The information is essential and must be always visible (show it inline)',
      'The tooltip contains interactive elements like links or buttons (use a popover)',
      'On touch devices where hover is unreliable (provide inline text instead)',
      'The tooltip text is longer than 1-2 short sentences',
    ],
    accessibilityRequirements: [
      'The tooltip element has role="tooltip"',
      'The trigger element uses aria-describedby pointing to the tooltip id',
      'Tooltip appears on both hover and keyboard focus of the trigger',
      'Tooltip can be dismissed with Escape key without moving focus',
      'Content is pure text (no interactive elements)',
    ],
    implementationChecklist: [
      'Show on hover after a short delay (200-400ms) and on keyboard focus immediately',
      'Position dynamically to avoid viewport edges (flip/shift as needed)',
      'Dismiss on mouse leave, focus loss, Escape key, or scroll',
      'Keep text concise (ideally under 80 characters)',
      'Use consistent styling (dark background, light text, small arrow) across the app',
      'Ensure tooltip has sufficient contrast and readable font size',
    ],
  },
  // ---------------------------------------------------------------------------
  // LAYOUT PATTERNS
  // ---------------------------------------------------------------------------
  {
    name: 'Hero Section',
    category: 'layout',
    description: 'A large, prominent section at the top of a page featuring key messaging, a striking visual, and a primary call-to-action to capture user attention immediately.',
    whenToUse: [
      'Landing pages where the first impression and value proposition are critical',
      'Product pages that need to showcase a key visual or message',
      'Marketing pages that drive toward a single primary conversion',
    ],
    whenNotToUse: [
      'Dashboard or application pages where users need to get to content immediately',
      'Pages where above-the-fold content density is more important than impact',
      'Repeat-visit pages where users already know the value proposition',
    ],
    accessibilityRequirements: [
      'Text over images has sufficient contrast (4.5:1 for normal text, 3:1 for large text)',
      'Background images have a semi-transparent overlay to ensure text readability',
      'Hero heading is an <h1> as the first heading on the page',
      'CTA button is keyboard accessible with visible focus state',
      'Background video has pause control and does not autoplay audio',
    ],
    implementationChecklist: [
      'Use a single, clear headline with supporting subtext',
      'Include one primary CTA button (optionally a secondary CTA)',
      'Optimize hero images for performance (responsive srcset, WebP/AVIF, lazy attribute for LCP)',
      'Ensure the hero is responsive and content reflows gracefully on mobile',
      'Add a text overlay or gradient on background images for text readability',
      'Test on multiple viewports: 375px, 768px, 1024px, 1440px',
    ],
  },
  {
    name: 'Split Screen',
    category: 'layout',
    description: 'A layout dividing the viewport into two equal or proportioned halves, typically with content on one side and a visual or form on the other.',
    whenToUse: [
      'Login/signup pages with branding imagery alongside a form',
      'Product pages with image on one side and details on the other',
      'Comparison layouts showing before/after or two options side by side',
    ],
    whenNotToUse: [
      'Mobile viewports where the split would make each half too narrow',
      'Content-heavy pages where both halves need more than 50% width',
      'When the two halves have no meaningful relationship to justify the split',
    ],
    accessibilityRequirements: [
      'Reading order follows a logical flow (typically left to right, top to bottom)',
      'On mobile, content stacks vertically in a sensible order (content before decorative image)',
      'Both halves are independently scrollable or flow naturally',
    ],
    implementationChecklist: [
      'Use CSS Grid or Flexbox with a 50/50 or 40/60 split',
      'Stack vertically on mobile with the primary content on top',
      'Ensure images scale proportionally and do not distort',
      'Add a vertical divider line or contrasting backgrounds for visual separation',
      'Test that text in the narrower column remains readable at all breakpoints',
    ],
  },
  {
    name: 'Grid Layout',
    category: 'layout',
    description: 'A structured layout system using consistent columns, gutters, and margins to align content elements across the page.',
    whenToUse: [
      'Complex pages with multiple content sections that need consistent alignment',
      'Design systems that require a predictable layout framework',
      'Any page that benefits from a structured, modular content arrangement',
    ],
    whenNotToUse: [
      'Very simple pages with only one content column',
      'Freeform creative layouts that intentionally break grid conventions',
    ],
    accessibilityRequirements: [
      'Content reading order in the DOM matches the visual reading order',
      'CSS Grid order or Flexbox order property does not create a mismatch between visual and DOM order',
      'Landmark roles (<main>, <nav>, <aside>) are used to define page regions',
    ],
    implementationChecklist: [
      'Define a consistent column grid (e.g., 12-column grid with 16-24px gutters)',
      'Set container max-width (e.g., 1280px) with auto margins for centering',
      'Use responsive column spans (12 cols on mobile, 6 cols on tablet, 4 cols on desktop)',
      'Maintain consistent gutters and margins across all breakpoints',
      'Align all content to the grid including images, cards, and text blocks',
      'Document the grid system in the design system for team consistency',
    ],
  },
  {
    name: 'Masonry Layout',
    category: 'layout',
    description: 'A layout where items of varying heights are arranged in columns, filling vertical space efficiently like bricks in a wall, creating a dynamic visual pattern.',
    whenToUse: [
      'Content items have significantly varying heights (image galleries, blog cards with excerpts)',
      'Visual dynamism and density are desired over strict row alignment',
      'Pinterest-style browsing experiences for visual content',
    ],
    whenNotToUse: [
      'Items are uniform in size and a standard grid is more predictable',
      'Users need to scan items in a strict row-by-row order',
      'Accessibility is paramount and consistent scanning patterns are required',
    ],
    accessibilityRequirements: [
      'DOM order matches a logical reading sequence even if visual order differs',
      'Items are navigable via keyboard in a predictable order',
      'Screen readers announce items in the DOM order, not the visual column order',
    ],
    implementationChecklist: [
      'Use CSS columns, CSS Grid with masonry value (experimental), or a JavaScript masonry library',
      'Handle responsive reflow: fewer columns on smaller viewports',
      'Lazy-load images and implement placeholder aspect ratios to prevent layout shift',
      'Consider a fallback to standard grid for browsers without masonry support',
      'Test DOM order vs. visual order for accessibility compliance',
    ],
  },
  {
    name: 'Sticky Header',
    category: 'layout',
    description: 'A page header or navigation bar that remains fixed at the top of the viewport as the user scrolls, providing persistent access to navigation and key actions.',
    whenToUse: [
      'Long-scroll pages where users need navigation access throughout',
      'E-commerce sites where the cart, search, and navigation must be always reachable',
      'Applications where the header contains critical controls or status information',
    ],
    whenNotToUse: [
      'Short pages that do not scroll beyond the viewport',
      'Mobile viewports where the header would consume too much vertical space (consider auto-hide)',
      'Reading-focused pages where immersive full-screen content is preferred',
    ],
    accessibilityRequirements: [
      'Sticky header must not obscure content that receives keyboard focus (scroll padding needed)',
      'Skip-to-content link should bypass the sticky header',
      'Header landmark (<header>) remains properly structured in the accessibility tree',
    ],
    implementationChecklist: [
      'Use position: sticky with top: 0 (preferred over position: fixed for layout flow)',
      'Add scroll-padding-top to <html> equal to the header height for anchor link navigation',
      'Consider a shrinking header that reduces height on scroll for more content space',
      'Implement hide-on-scroll-down / show-on-scroll-up for mobile to reclaim space',
      'Add a subtle shadow when scrolled to indicate the header is elevated above content',
      'Ensure z-index is high enough to stay above all content but not above modals/overlays',
    ],
  },
  // ---------------------------------------------------------------------------
  // ADDITIONAL PATTERNS (to reach 30+)
  // ---------------------------------------------------------------------------
  {
    name: 'Search Bar',
    category: 'navigation',
    description: 'A text input field for searching content within the site or application, often enhanced with autocomplete, filters, and recent search history.',
    whenToUse: [
      'The site has a large amount of content that users need to find quickly',
      'Users know what they are looking for and want a direct path to it',
      'Browsing via navigation alone is inefficient given the content volume',
    ],
    whenNotToUse: [
      'The site has very little content that is already fully visible',
      'Users are primarily browsing without a specific target in mind',
    ],
    accessibilityRequirements: [
      'Input has role="searchbox" or is inside a <search> landmark or <form role="search">',
      'Autocomplete results use role="listbox" with role="option" for each suggestion',
      'Active suggestion highlighted with aria-activedescendant',
      'Search results are announced via aria-live region',
    ],
    implementationChecklist: [
      'Include a visible search icon and clear button within the input',
      'Implement debounced autocomplete (300ms delay) for suggestions',
      'Show recent searches and popular queries when the field is focused but empty',
      'Support keyboard navigation: arrow keys for suggestions, Enter to search, Escape to clear',
      'Display result count and highlight matching terms in results',
      'Handle empty results with helpful suggestions',
    ],
  },
  {
    name: 'Bottom Navigation Bar',
    category: 'navigation',
    description: 'A fixed navigation bar at the bottom of the screen on mobile devices, containing 3-5 primary navigation items as icons with labels.',
    whenToUse: [
      'Mobile applications with 3-5 primary sections users frequently switch between',
      'The app follows a hub-and-spoke navigation model',
      'Users need one-handed access to navigation on mobile',
    ],
    whenNotToUse: [
      'Desktop-only applications where top navigation is standard',
      'More than 5 navigation items are needed (use a sidebar or hamburger menu)',
      'The app is primarily content-driven with a linear reading flow',
    ],
    accessibilityRequirements: [
      'Wrapped in <nav> with aria-label="Main navigation"',
      'Active item indicated with aria-current="page"',
      'Touch targets are at least 44x44px with adequate spacing between items',
      'Labels are visible alongside icons; not icon-only',
    ],
    implementationChecklist: [
      'Fix to the bottom of the viewport with position: fixed or sticky',
      'Include both icon and text label for each item',
      'Highlight the active section with color and/or weight change',
      'Ensure the bar does not overlap page content (add bottom padding to page)',
      'Handle safe areas on devices with home indicators (env(safe-area-inset-bottom))',
      'Consider hiding on scroll down and showing on scroll up to save space',
    ],
  },
  {
    name: 'Accordion',
    category: 'data-display',
    description: 'Vertically stacked sections with expandable/collapsible panels, allowing users to show and hide content sections to conserve space.',
    whenToUse: [
      'FAQs or help pages with many questions and answers',
      'Settings pages with grouped options',
      'Mobile navigation as an alternative to nested menus',
      'Long content pages where users need only specific sections',
    ],
    whenNotToUse: [
      'All content sections are equally important and should be visible at once',
      'Users need to compare content across multiple sections simultaneously',
      'There are only 2-3 items that would be better shown expanded by default',
    ],
    accessibilityRequirements: [
      'Header buttons use aria-expanded="true"/"false" to indicate state',
      'Header buttons use aria-controls pointing to the panel element id',
      'Panels use role="region" with aria-labelledby pointing to the header button',
      'Arrow keys navigate between accordion headers; Home/End jump to first/last',
    ],
    implementationChecklist: [
      'Use <button> elements for accordion headers, never <div> or <a>',
      'Decide on single-open (only one section expanded) or multi-open behavior',
      'Animate expand/collapse with max-height transition or grid-template-rows',
      'Include a visual indicator (chevron/plus icon) showing expand/collapse state',
      'Allow deep-linking to specific accordion sections via URL hash',
      'Default the first or most relevant section to expanded on page load',
    ],
  },
  {
    name: 'Carousel / Slider',
    category: 'data-display',
    description: 'A horizontally scrollable sequence of content panels or cards, navigable via arrows, dots, swipe gestures, or auto-advancement.',
    whenToUse: [
      'Showcasing multiple hero images or promotional banners in limited space',
      'Displaying a set of related items (testimonials, product images) in a compact area',
      'When horizontal scrolling is natural for the content type (image galleries)',
    ],
    whenNotToUse: [
      'Critical content or CTAs that may be missed if not on the first slide',
      'Content that users must see all of (use a grid or list instead)',
      'When auto-play would distract or override user control',
    ],
    accessibilityRequirements: [
      'Carousel region has role="region" with an aria-label',
      'Previous/Next buttons have descriptive aria-labels',
      'Auto-play has a visible pause/stop button',
      'Slide indicators (dots) have aria-label describing which slide they represent',
      'Current slide indicated with aria-current="true" on its dot indicator',
    ],
    implementationChecklist: [
      'Include visible Previous/Next arrow buttons',
      'Add dot indicators or slide counter showing current position',
      'Support touch swipe gestures for mobile navigation',
      'If auto-play is used, provide a pause button and pause on hover/focus',
      'Ensure slides are keyboard navigable',
      'Lazy-load off-screen slides for performance',
      'Avoid auto-play by default; let users control advancement',
    ],
  },
  {
    name: 'Stepper / Step Indicator',
    category: 'feedback',
    description: 'A visual component showing the steps in a process, the current step, and the completion status of each step, guiding users through a sequential workflow.',
    whenToUse: [
      'Multi-step processes (checkout, onboarding, application forms)',
      'Users need to understand how many steps remain and their current position',
      'The process is linear with distinct, nameable phases',
    ],
    whenNotToUse: [
      'The process has only 2 steps (a simple Back/Next is sufficient)',
      'Steps are not sequential or can be completed in any order',
      'The process is fluid with no clear step boundaries',
    ],
    accessibilityRequirements: [
      'Uses aria-current="step" on the active step element',
      'Completed steps are distinguishable from upcoming ones (not by color alone)',
      'Step labels are descriptive text, not just numbers',
      'The entire stepper is described with a group label (aria-label="Checkout progress")',
    ],
    implementationChecklist: [
      'Display step names alongside numbers for clarity',
      'Visually distinguish completed, active, and upcoming steps',
      'Use checkmarks or filled circles for completed steps',
      'Optionally allow clicking completed steps to navigate back',
      'On mobile, show a compact version (e.g., "Step 2 of 4") if horizontal space is limited',
      'Connect steps with a progress line that fills as steps complete',
    ],
  },
  {
    name: 'Filter and Sort Controls',
    category: 'data-display',
    description: 'Interactive controls that allow users to narrow down and reorder a list of items based on specific criteria.',
    whenToUse: [
      'The data set is large enough that users cannot scan all items easily',
      'Items have multiple filterable attributes (category, price range, status, date)',
      'Users have specific criteria in mind and need to find matching items quickly',
    ],
    whenNotToUse: [
      'The data set is small (under 15 items) and fully visible at once',
      'Items have no meaningful filterable attributes',
      'The content is editorially curated and the order is intentional',
    ],
    accessibilityRequirements: [
      'Filter changes are announced to screen readers ("12 results found")',
      'Applied filters are visible and can be individually removed (chip/tag pattern)',
      'Filter controls are keyboard accessible (checkboxes, selects, sliders)',
      'A "Clear all filters" action is available and keyboard accessible',
    ],
    implementationChecklist: [
      'Show active filter count on the filter button/section',
      'Display applied filters as removable chips/tags above results',
      'Update result count immediately when filters change',
      'Include a "Clear all" action to reset all filters at once',
      'Persist filter state in URL parameters for bookmarkability',
      'On mobile, use a filter drawer or modal rather than inline sidebar filters',
      'Sort options include common useful orderings (newest, price, relevance)',
    ],
  },
  {
    name: 'Tag / Chip Input',
    category: 'forms',
    description: 'An input field that allows users to enter and manage multiple values displayed as removable tags or chips within the field.',
    whenToUse: [
      'Users need to add multiple values to a single field (tags, categories, email recipients)',
      'The number of values is variable and not from a predefined set',
      'Values should be individually removable',
    ],
    whenNotToUse: [
      'Users can only select from a fixed set of options (use multi-select dropdown)',
      'Only a single value is expected (use a standard text input)',
      'The field should accept free-form text without tokenization',
    ],
    accessibilityRequirements: [
      'Each tag/chip is focusable and has an accessible remove button',
      'The input field has aria-describedby linking to instructions',
      'Tags are announced when added or removed via aria-live region',
      'Keyboard: Backspace removes last tag, arrow keys navigate between tags',
    ],
    implementationChecklist: [
      'Create tags on Enter, Tab, or comma keypress',
      'Display tags inline within the input field boundary',
      'Each tag has a visible remove (X) button',
      'Support Backspace to remove the last tag when input is empty',
      'Optionally provide autocomplete suggestions from existing values',
      'Validate tags on creation (format, duplicates, maximum count)',
    ],
  },
  {
    name: 'Toggle / Switch',
    category: 'forms',
    description: 'A binary control that allows users to turn a setting on or off with immediate effect, visually resembling a physical toggle switch.',
    whenToUse: [
      'The setting has two mutually exclusive states (on/off, enabled/disabled)',
      'The change takes effect immediately without requiring a save/submit action',
      'The setting controls a clear binary preference (dark mode, notifications, auto-save)',
    ],
    whenNotToUse: [
      'The setting requires a form submission to take effect (use a checkbox instead)',
      'There are more than two options (use radio buttons or a select)',
      'The choice is part of a form where multiple fields are submitted together (use a checkbox)',
    ],
    accessibilityRequirements: [
      'Uses role="switch" with aria-checked="true"/"false"',
      'Has an accessible label via <label> element or aria-label',
      'Toggle is operable via Space key (not Enter)',
      'Visual on/off state is distinguishable by more than color alone (position and label)',
    ],
    implementationChecklist: [
      'Use role="switch" for correct semantics (not role="checkbox")',
      'Include visible "On"/"Off" labels or show the current state in text',
      'Animate the toggle knob sliding between positions (150-200ms)',
      'Make the clickable area large enough (at least 44x44px touch target)',
      'Clearly differentiate on/off states with color AND position',
      'Apply the change immediately when toggled (no separate save button)',
    ],
  },
];

// =============================================================================
// 3. WCAG 2.1 AA QUICK REFERENCE
// =============================================================================
// All Level A and AA success criteria from the Web Content Accessibility
// Guidelines 2.1, organized by principle (POUR: Perceivable, Operable,
// Understandable, Robust). Each criterion includes its number, name, level,
// description, a testing method, and common failures.
// =============================================================================

export const WCAG_GUIDELINES: WCAGGuideline[] = [
  // ---------------------------------------------------------------------------
  // PRINCIPLE 1: PERCEIVABLE
  // ---------------------------------------------------------------------------
  {
    criterion: '1.1.1',
    name: 'Non-text Content',
    level: 'A',
    principle: 'perceivable',
    description: 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose. Decorative images, formatting, and CAPTCHA have specific handling requirements.',
    testingMethod: 'Inspect all <img>, <svg>, <canvas>, <video>, and icon elements for alt text, aria-label, or aria-labelledby. Verify decorative images use alt="" or aria-hidden="true".',
    commonFailures: [
      'Images with missing or empty alt attributes that are not decorative',
      'Icon fonts used without corresponding text alternatives',
      'SVG icons without a <title> element or aria-label',
      'Background images that convey information with no text alternative',
      'CAPTCHA images without an audio or text alternative',
    ],
  },
  {
    criterion: '1.2.1',
    name: 'Audio-only and Video-only (Prerecorded)',
    level: 'A',
    principle: 'perceivable',
    description: 'For prerecorded audio-only, a text transcript is provided. For prerecorded video-only (no audio), either a text description or an audio track describing the visual information is provided.',
    testingMethod: 'Locate all audio-only and video-only media. Verify a transcript or descriptive alternative is provided adjacent to or linked from the media.',
    commonFailures: [
      'Podcast episodes with no transcript available',
      'Instructional silent videos with no text description',
      'Audio clips embedded without any textual equivalent',
    ],
  },
  {
    criterion: '1.2.2',
    name: 'Captions (Prerecorded)',
    level: 'A',
    principle: 'perceivable',
    description: 'Captions are provided for all prerecorded audio content in synchronized media, except when the media is a media alternative for text and is clearly labeled as such.',
    testingMethod: 'Play all video content and verify synchronized captions are available. Check that captions accurately represent spoken dialogue and relevant sound effects.',
    commonFailures: [
      'Video with auto-generated captions that have not been reviewed for accuracy',
      'Missing captions entirely on prerecorded video content',
      'Captions that omit speaker identification or important sound effects',
    ],
  },
  {
    criterion: '1.2.3',
    name: 'Audio Description or Media Alternative (Prerecorded)',
    level: 'A',
    principle: 'perceivable',
    description: 'An alternative for time-based media or audio description of the prerecorded video content is provided, unless the media is clearly labeled as a text alternative.',
    testingMethod: 'Verify that video content includes audio description for visual-only information, or a full text transcript is available.',
    commonFailures: [
      'Instructional video with on-screen text or diagrams not described in audio',
      'No transcript or audio description provided for visual demonstrations',
    ],
  },
  {
    criterion: '1.2.5',
    name: 'Audio Description (Prerecorded)',
    level: 'AA',
    principle: 'perceivable',
    description: 'Audio description is provided for all prerecorded video content in synchronized media.',
    testingMethod: 'Verify an audio description track is available for video content where visual information is not conveyed through the existing audio.',
    commonFailures: [
      'Video tutorials that rely on visual demonstrations without narration',
      'Presentations where slide content is not read aloud',
    ],
  },
  {
    criterion: '1.3.1',
    name: 'Info and Relationships',
    level: 'A',
    principle: 'perceivable',
    description: 'Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text. Headings, lists, tables, and form labels must use proper semantic markup.',
    testingMethod: 'Verify headings use <h1>-<h6> elements in proper hierarchy. Check lists use <ul>/<ol>. Confirm tables use <th> with scope. Verify form inputs have associated <label> elements.',
    commonFailures: [
      'Headings created with styled <div> or <span> instead of <h1>-<h6> elements',
      'Tables used for layout rather than data, without role="presentation"',
      'Form fields without properly associated <label> elements',
      'Lists created with <br> tags and manual bullets instead of <ul>/<li>',
      'Bold text used as headings without heading markup',
    ],
  },
  {
    criterion: '1.3.2',
    name: 'Meaningful Sequence',
    level: 'A',
    principle: 'perceivable',
    description: 'When the sequence in which content is presented affects its meaning, a correct reading sequence can be programmatically determined.',
    testingMethod: 'Disable CSS and verify the content still reads in a logical, meaningful order. Check that CSS order, flexbox order, or grid placement does not create a mismatch between visual and DOM order.',
    commonFailures: [
      'CSS Flexbox or Grid order property creates visual order that differs from DOM/reading order',
      'Content positioned with CSS floats or absolute positioning reads out of order without styles',
      'Tabular data whose meaning is lost when read in DOM order without table structure',
    ],
  },
  {
    criterion: '1.3.3',
    name: 'Sensory Characteristics',
    level: 'A',
    principle: 'perceivable',
    description: 'Instructions provided for understanding and operating content do not rely solely on sensory characteristics of components such as shape, color, size, visual location, orientation, or sound.',
    testingMethod: 'Search for instructions that reference only visual properties ("click the round button," "the red text," "the box on the right"). Verify multiple cues are provided.',
    commonFailures: [
      'Instructions like "Click the green button to proceed" without additional text label',
      'Error indication relying solely on red color with no icon or text label',
      'Navigation described only by position: "Use the menu on the left"',
    ],
  },
  {
    criterion: '1.3.4',
    name: 'Orientation',
    level: 'AA',
    principle: 'perceivable',
    description: 'Content does not restrict its view and operation to a single display orientation, such as portrait or landscape, unless a specific orientation is essential.',
    testingMethod: 'Rotate the device between portrait and landscape and verify all content and functionality remains usable in both orientations.',
    commonFailures: [
      'CSS/JS that locks the page to portrait mode only',
      'Content that overflows or is clipped in landscape orientation',
      'Functionality that only works in one orientation without essential justification',
    ],
  },
  {
    criterion: '1.3.5',
    name: 'Identify Input Purpose',
    level: 'AA',
    principle: 'perceivable',
    description: 'The purpose of each input field collecting information about the user can be programmatically determined when the input serves a purpose identified in the Input Purposes list.',
    testingMethod: 'Verify that common personal data input fields (name, email, address, phone, credit card) have the appropriate autocomplete attribute values.',
    commonFailures: [
      'Name fields without autocomplete="name"',
      'Email fields without autocomplete="email"',
      'Address fields without appropriate autocomplete values (street-address, postal-code, etc.)',
    ],
  },
  {
    criterion: '1.4.1',
    name: 'Use of Color',
    level: 'A',
    principle: 'perceivable',
    description: 'Color is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element.',
    testingMethod: 'View the page in grayscale (browser extension or OS setting). Verify all information, links, required fields, and error states are still distinguishable without color.',
    commonFailures: [
      'Required form fields indicated only by a red asterisk with no text',
      'Links within body text distinguished only by color, not underline or other visual indicator',
      'Charts or graphs where data series are only differentiated by color',
      'Status badges (success/error) using only green/red with no icon or label',
    ],
  },
  {
    criterion: '1.4.2',
    name: 'Audio Control',
    level: 'A',
    principle: 'perceivable',
    description: 'If any audio on a page plays automatically for more than 3 seconds, either a mechanism is available to pause or stop the audio, or a mechanism is available to control audio volume independently from the system volume.',
    testingMethod: 'Identify any auto-playing audio or video elements. Verify pause/stop/volume controls are available and accessible.',
    commonFailures: [
      'Background music that plays automatically with no visible pause control',
      'Video that auto-plays with audio and no easy way to mute',
    ],
  },
  {
    criterion: '1.4.3',
    name: 'Contrast (Minimum)',
    level: 'AA',
    principle: 'perceivable',
    description: 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for large text (at least 3:1), incidental text, or logotypes.',
    testingMethod: 'Use a contrast checking tool (axe, Lighthouse, WebAIM contrast checker) to test all text/background color combinations. Large text is 18pt+ regular or 14pt+ bold.',
    commonFailures: [
      'Light gray text on a white background falling below 4.5:1 ratio',
      'Placeholder text with insufficient contrast against the input background',
      'Text over images or gradients where contrast varies and drops below the threshold in some areas',
      'Disabled state text that is unreadable (though incidental text is exempt, it should still be legible)',
    ],
  },
  {
    criterion: '1.4.4',
    name: 'Resize Text',
    level: 'AA',
    principle: 'perceivable',
    description: 'Text can be resized up to 200 percent without assistive technology and without loss of content or functionality.',
    testingMethod: 'Zoom the browser to 200%. Verify all text content is still visible, readable, and functional. Check that no content is clipped, overlapping, or hidden.',
    commonFailures: [
      'Text that overflows its container and is clipped by overflow: hidden at 200% zoom',
      'Fixed-height containers that do not grow with text size',
      'Functionality that breaks at 200% zoom due to hardcoded pixel dimensions',
    ],
  },
  {
    criterion: '1.4.5',
    name: 'Images of Text',
    level: 'AA',
    principle: 'perceivable',
    description: 'If the technologies being used can achieve the visual presentation, text is used to convey information rather than images of text, except for text in logotypes or where a particular presentation is essential.',
    testingMethod: 'Identify any images that contain text. Verify the text could not be achieved with styled HTML text instead.',
    commonFailures: [
      'Headings rendered as images instead of styled HTML text',
      'Call-to-action buttons using image files instead of styled <button> elements',
      'Infographics with embedded text that has no HTML equivalent',
    ],
  },
  {
    criterion: '1.4.10',
    name: 'Reflow',
    level: 'AA',
    principle: 'perceivable',
    description: 'Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions, at a width of 320 CSS pixels (for vertical scrolling content) or a height of 256 CSS pixels (for horizontal scrolling content).',
    testingMethod: 'Set the browser viewport width to 320px. Verify no horizontal scrollbar appears (except for data tables, maps, diagrams, or other content where two-dimensional layout is essential).',
    commonFailures: [
      'Fixed-width layouts that do not respond to narrow viewports',
      'Horizontal scrollbars appearing on mobile viewports for non-exempt content',
      'Content clipped or overlapping at 320px width',
    ],
  },
  {
    criterion: '1.4.11',
    name: 'Non-text Contrast',
    level: 'AA',
    principle: 'perceivable',
    description: 'The visual presentation of UI components (their states and boundaries) and graphical objects have a contrast ratio of at least 3:1 against adjacent colors.',
    testingMethod: 'Check contrast of form input borders, button borders, focus indicators, icons, and chart elements against their adjacent background colors. Minimum 3:1 ratio.',
    commonFailures: [
      'Form input borders with insufficient contrast against the page background',
      'Icon buttons where the icon has less than 3:1 contrast',
      'Focus indicators that do not meet 3:1 contrast against the background',
      'Custom checkboxes or radio buttons with low contrast borders',
    ],
  },
  {
    criterion: '1.4.12',
    name: 'Text Spacing',
    level: 'AA',
    principle: 'perceivable',
    description: 'No loss of content or functionality occurs when users override text styles to set line height to 1.5x, paragraph spacing to 2x font size, letter spacing to 0.12em, and word spacing to 0.16em.',
    testingMethod: 'Apply the specified text spacing overrides using a bookmarklet or browser extension. Verify no content is clipped, truncated, or overlapping.',
    commonFailures: [
      'Text overflowing fixed-height containers when spacing is increased',
      'Overlapping text due to absolute positioning that does not accommodate spacing changes',
      'Content disappearing behind other elements when line-height increases',
    ],
  },
  {
    criterion: '1.4.13',
    name: 'Content on Hover or Focus',
    level: 'AA',
    principle: 'perceivable',
    description: 'Where receiving and then removing hover or focus triggers additional content to become visible and then hidden, the additional content is dismissible (Escape key), hoverable (mouse can move to it without it disappearing), and persistent (remains visible until dismissed or trigger is removed).',
    testingMethod: 'Test all tooltips, popovers, and hover-revealed content. Verify they can be dismissed with Escape, remain visible when the pointer moves to them, and persist until deliberately closed.',
    commonFailures: [
      'Tooltips that disappear when the mouse moves toward them',
      'Hover content that cannot be dismissed without moving the mouse away',
      'Dropdown menus that close immediately when the cursor leaves the trigger',
    ],
  },
  // ---------------------------------------------------------------------------
  // PRINCIPLE 2: OPERABLE
  // ---------------------------------------------------------------------------
  {
    criterion: '2.1.1',
    name: 'Keyboard',
    level: 'A',
    principle: 'operable',
    description: 'All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes, except where the underlying function requires input that depends on the path of the user\'s movement and not just the endpoints.',
    testingMethod: 'Unplug the mouse (or avoid touching the trackpad). Tab through every interactive element on the page. Verify all features work using only keyboard input.',
    commonFailures: [
      'Click handlers on <div> or <span> elements without keyboard event handlers',
      'Drag-and-drop functionality with no keyboard alternative',
      'Custom components that are only operable via mouse click',
      'Hover-only menus with no keyboard-triggered equivalent',
    ],
  },
  {
    criterion: '2.1.2',
    name: 'No Keyboard Trap',
    level: 'A',
    principle: 'operable',
    description: 'If keyboard focus can be moved to a component using the keyboard, then focus can be moved away from that component using only the keyboard. If it requires more than standard navigation keys, the user is advised of the method.',
    testingMethod: 'Tab through every interactive component, including modals, embedded widgets, and iframes. Verify you can always tab out or use Escape to exit without getting stuck.',
    commonFailures: [
      'Modal dialogs that do not allow Escape to close or Tab to cycle out',
      'Third-party embedded widgets (video players, maps) that trap focus indefinitely',
      'Custom rich text editors where Tab inserts content instead of moving focus',
    ],
  },
  {
    criterion: '2.1.4',
    name: 'Character Key Shortcuts',
    level: 'A',
    principle: 'operable',
    description: 'If a keyboard shortcut is implemented using only letter, punctuation, number, or symbol characters, then it can be turned off, remapped, or is only active when the relevant component has focus.',
    testingMethod: 'Identify any single-character keyboard shortcuts. Verify they can be disabled, remapped, or only fire when their component is focused.',
    commonFailures: [
      'Single-letter keyboard shortcuts that activate from anywhere on the page, conflicting with screen reader navigation',
      'No settings page or mechanism to disable or remap shortcuts',
    ],
  },
  {
    criterion: '2.2.1',
    name: 'Timing Adjustable',
    level: 'A',
    principle: 'operable',
    description: 'For each time limit set by the content, the user can turn off, adjust, or extend the time limit (with some exceptions for real-time events, essential timeouts, or limits over 20 hours).',
    testingMethod: 'Identify all time-limited interactions (session timeouts, auto-advancing content, countdown timers). Verify users can extend, adjust, or disable the time limit.',
    commonFailures: [
      'Session timeout with no warning or extension mechanism',
      'Auto-advancing carousel slides with no pause control',
      'Timed quiz or form with no option to extend',
    ],
  },
  {
    criterion: '2.2.2',
    name: 'Pause, Stop, Hide',
    level: 'A',
    principle: 'operable',
    description: 'For moving, blinking, scrolling, or auto-updating information that starts automatically, lasts more than 5 seconds, and is presented in parallel with other content, the user can pause, stop, or hide it.',
    testingMethod: 'Identify all auto-playing animations, scrolling tickers, or auto-updating content. Verify a visible pause/stop control exists.',
    commonFailures: [
      'Auto-playing video backgrounds with no pause button',
      'News tickers or marquee text that cannot be paused',
      'Auto-refreshing data widgets with no way to stop updates',
    ],
  },
  {
    criterion: '2.3.1',
    name: 'Three Flashes or Below Threshold',
    level: 'A',
    principle: 'operable',
    description: 'Pages do not contain anything that flashes more than three times per second, or the flash is below the general flash and red flash thresholds.',
    testingMethod: 'Inspect all animations and video content for flashing. Use the Photosensitive Epilepsy Analysis Tool (PEAT) for automated detection of flash rates above the threshold.',
    commonFailures: [
      'Rapid CSS animations or transitions that cause flashing effects',
      'Video content with strobe-like lighting effects',
      'Cursor-following effects that create rapid visual changes',
    ],
  },
  {
    criterion: '2.4.1',
    name: 'Bypass Blocks',
    level: 'A',
    principle: 'operable',
    description: 'A mechanism is available to bypass blocks of content that are repeated on multiple pages, such as navigation headers.',
    testingMethod: 'Press Tab as the very first action on a page. Verify a "Skip to main content" link appears as the first focusable element and correctly jumps focus to the main content area.',
    commonFailures: [
      'No skip navigation link provided',
      'Skip link exists but does not become visible on focus',
      'Skip link target does not exist or does not receive focus',
    ],
  },
  {
    criterion: '2.4.2',
    name: 'Page Titled',
    level: 'A',
    principle: 'operable',
    description: 'Pages have titles that describe topic or purpose.',
    testingMethod: 'Check the <title> element in the document head. Verify each page has a unique, descriptive title that identifies the page content and site.',
    commonFailures: [
      'All pages share the same generic title (e.g., "My Website")',
      'Page titles do not reflect the current page content',
      'SPA navigation does not update the document title on route change',
    ],
  },
  {
    criterion: '2.4.3',
    name: 'Focus Order',
    level: 'A',
    principle: 'operable',
    description: 'If a page can be navigated sequentially and the navigation sequences affect meaning or operation, focusable components receive focus in an order that preserves meaning and operability.',
    testingMethod: 'Tab through all interactive elements. Verify the focus order follows the logical reading order (top-to-bottom, left-to-right for LTR languages). Check that modals and dynamically inserted content receive focus appropriately.',
    commonFailures: [
      'Focus order does not match visual layout due to CSS positioning or tabindex misuse',
      'Positive tabindex values creating unpredictable focus order',
      'Dynamically injected content that does not receive focus or is skipped in tab order',
    ],
  },
  {
    criterion: '2.4.4',
    name: 'Link Purpose (In Context)',
    level: 'A',
    principle: 'operable',
    description: 'The purpose of each link can be determined from the link text alone, or from the link text together with its programmatically determined context.',
    testingMethod: 'Review all link text. Verify each link clearly describes its destination or function. Check for ambiguous text like "click here" or "read more" without sufficient context.',
    commonFailures: [
      'Generic link text such as "Click here," "Read more," or "Learn more" without context',
      'Multiple "Read more" links on the same page that are indistinguishable out of context',
      'Links with no text content (empty <a> tags or icon-only links without aria-label)',
    ],
  },
  {
    criterion: '2.4.5',
    name: 'Multiple Ways',
    level: 'AA',
    principle: 'operable',
    description: 'More than one way is available to locate a page within a set of pages, except where the page is a result of or a step in a process.',
    testingMethod: 'Verify at least two navigation methods are available: site navigation menu, site search, sitemap, table of contents, breadcrumbs, or related links.',
    commonFailures: [
      'No search functionality on a large content site',
      'No sitemap or alternative navigation beyond the main menu',
      'Content accessible only through a specific sequence of clicks',
    ],
  },
  {
    criterion: '2.4.6',
    name: 'Headings and Labels',
    level: 'AA',
    principle: 'operable',
    description: 'Headings and labels describe topic or purpose.',
    testingMethod: 'Review all heading elements and form labels. Verify they are descriptive, unique within their context, and accurately describe the content or input they are associated with.',
    commonFailures: [
      'Vague headings like "Introduction" or "Details" without specific context',
      'Form labels that do not describe what should be entered (e.g., "Field 1")',
      'Duplicate headings on the same page without differentiation',
    ],
  },
  {
    criterion: '2.4.7',
    name: 'Focus Visible',
    level: 'AA',
    principle: 'operable',
    description: 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.',
    testingMethod: 'Tab through every focusable element. Verify each one has a clearly visible focus indicator (outline, ring, background change, or border) that meets contrast requirements.',
    commonFailures: [
      'Global CSS rule outline: none or outline: 0 without a replacement focus style',
      'Focus indicators with insufficient contrast against the background',
      'Custom components that suppress browser default focus indicators without providing alternatives',
    ],
  },
  {
    criterion: '2.5.1',
    name: 'Pointer Gestures',
    level: 'A',
    principle: 'operable',
    description: 'All functionality that uses multipoint or path-based gestures can be operated with a single pointer without a path-based gesture, unless a multipoint or path-based gesture is essential.',
    testingMethod: 'Identify all gesture-based interactions (pinch-to-zoom, multi-finger swipe, drawing). Verify single-pointer alternatives exist (buttons, single-click controls).',
    commonFailures: [
      'Map zoom requiring pinch gesture with no +/- button alternatives',
      'Carousel navigation requiring swipe with no arrow button alternatives',
      'Drawing or path-based input with no alternative method',
    ],
  },
  {
    criterion: '2.5.2',
    name: 'Pointer Cancellation',
    level: 'A',
    principle: 'operable',
    description: 'For functionality that can be operated using a single pointer, at least one of the following is true: the down-event is not used to execute the function, the function can be aborted or undone, the up-event reverses the down-event outcome, or completing the function on the down-event is essential.',
    testingMethod: 'Test interactive elements by pressing the mouse button down on them, then moving the pointer away before releasing. Verify the action does not execute if the pointer is moved off the element.',
    commonFailures: [
      'Actions triggered on mousedown/touchstart instead of click/mouseup',
      'No ability to abort an action by moving the pointer away before releasing',
    ],
  },
  {
    criterion: '2.5.3',
    name: 'Label in Name',
    level: 'A',
    principle: 'operable',
    description: 'For user interface components with labels that include text or images of text, the accessible name contains the text that is presented visually.',
    testingMethod: 'Compare the visible label text of buttons and controls with their accessible name (aria-label, aria-labelledby, or <label>). Ensure the accessible name starts with or contains the visible text.',
    commonFailures: [
      'A button showing "Submit" visually but having aria-label="Send form data"',
      'Visible label "Search" but accessible name set to "Find items" via aria-label',
      'Image button with visual text "Next" but alt text set to "Continue to step 2"',
    ],
  },
  {
    criterion: '2.5.4',
    name: 'Motion Actuation',
    level: 'A',
    principle: 'operable',
    description: 'Functionality that can be operated by device motion or user motion can also be operated by user interface components and the motion response can be disabled, unless the motion is essential or disabling it would invalidate the activity.',
    testingMethod: 'Identify any features triggered by device motion (shake to undo, tilt to scroll). Verify UI-based alternatives exist and motion can be disabled in settings.',
    commonFailures: [
      'Shake-to-undo with no button-based undo alternative',
      'Tilt-to-scroll with no scroll controls or swipe alternative',
      'No setting to disable motion-triggered functionality',
    ],
  },
  // ---------------------------------------------------------------------------
  // PRINCIPLE 3: UNDERSTANDABLE
  // ---------------------------------------------------------------------------
  {
    criterion: '3.1.1',
    name: 'Language of Page',
    level: 'A',
    principle: 'understandable',
    description: 'The default human language of each page can be programmatically determined.',
    testingMethod: 'Verify the <html> element has a valid lang attribute (e.g., lang="en", lang="fr"). Check that the value matches the actual language of the page content.',
    commonFailures: [
      'Missing lang attribute on the <html> element entirely',
      'Incorrect lang value (e.g., lang="en" on a French-language page)',
      'Using an invalid or non-standard language code',
    ],
  },
  {
    criterion: '3.1.2',
    name: 'Language of Parts',
    level: 'AA',
    principle: 'understandable',
    description: 'The human language of each passage or phrase in the content can be programmatically determined, except for proper names, technical terms, words of indeterminate language, and words that have become part of the surrounding text\'s vernacular.',
    testingMethod: 'Identify sections of content in a different language from the page default. Verify those sections have a lang attribute specifying their language.',
    commonFailures: [
      'French quote on an English page without lang="fr" on the containing element',
      'Product names or phrases in another language without appropriate lang markup',
    ],
  },
  {
    criterion: '3.2.1',
    name: 'On Focus',
    level: 'A',
    principle: 'understandable',
    description: 'When any user interface component receives focus, it does not initiate a change of context (page navigation, form submission, new window, or significant content change).',
    testingMethod: 'Tab to every focusable element. Verify that receiving focus alone does not trigger navigation, modal opening, or other context changes.',
    commonFailures: [
      'A link or button that navigates to a new page on focus rather than on activation',
      'A select element that submits a form or navigates on focus',
      'A modal that opens when an element receives focus instead of on click',
    ],
  },
  {
    criterion: '3.2.2',
    name: 'On Input',
    level: 'A',
    principle: 'understandable',
    description: 'Changing the setting of any user interface component does not automatically cause a change of context unless the user has been advised of the behavior before using the component.',
    testingMethod: 'Change values in all form controls (selects, checkboxes, radio buttons, text inputs). Verify no unexpected navigation, form submission, or major content change occurs unless the user was warned.',
    commonFailures: [
      'A select dropdown that navigates to a new page when a value is selected',
      'A checkbox that immediately submits a form on change',
      'A radio button that triggers page navigation without warning',
    ],
  },
  {
    criterion: '3.2.3',
    name: 'Consistent Navigation',
    level: 'AA',
    principle: 'understandable',
    description: 'Navigational mechanisms that are repeated on multiple pages within a set of pages occur in the same relative order each time, unless a change is initiated by the user.',
    testingMethod: 'Compare the navigation menu order across multiple pages. Verify the order and structure of repeated navigation elements is consistent.',
    commonFailures: [
      'Navigation menu items in different order on different pages',
      'Footer links rearranged across pages',
      'Sidebar navigation that changes order based on page context without user initiation',
    ],
  },
  {
    criterion: '3.2.4',
    name: 'Consistent Identification',
    level: 'AA',
    principle: 'understandable',
    description: 'Components that have the same functionality within a set of pages are identified consistently.',
    testingMethod: 'Identify repeated functional components across pages (search bars, print buttons, navigation links). Verify they use the same labels, icons, and accessible names.',
    commonFailures: [
      'Search button labeled "Search" on one page and "Find" on another',
      'A print icon labeled "Print" on one page and "Generate PDF" on another',
      'Different icons used for the same function on different pages',
    ],
  },
  {
    criterion: '3.3.1',
    name: 'Error Identification',
    level: 'A',
    principle: 'understandable',
    description: 'If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text.',
    testingMethod: 'Submit forms with intentionally invalid data. Verify error messages appear in text, identify the specific field in error, and are presented adjacent to the field or in a clearly associated manner.',
    commonFailures: [
      'Error indicated only by changing the field border color with no text message',
      'Generic error message at the top of the form without identifying which field is wrong',
      'Error messages that are not programmatically associated with their fields',
    ],
  },
  {
    criterion: '3.3.2',
    name: 'Labels or Instructions',
    level: 'A',
    principle: 'understandable',
    description: 'Labels or instructions are provided when content requires user input.',
    testingMethod: 'Verify all form fields have visible labels (not just placeholders). Check that required fields are clearly indicated. Verify instructions are provided for fields with specific format requirements.',
    commonFailures: [
      'Form fields using placeholder text as the only label (disappears on input)',
      'Required fields not indicated visually or programmatically',
      'Complex input formats (phone, date) with no format hint or example',
    ],
  },
  {
    criterion: '3.3.3',
    name: 'Error Suggestion',
    level: 'AA',
    principle: 'understandable',
    description: 'If an input error is automatically detected and suggestions for correction are known, then the suggestions are provided to the user, unless it would jeopardize security or purpose.',
    testingMethod: 'Trigger validation errors on form fields. Verify the error messages include specific suggestions for correcting the input.',
    commonFailures: [
      '"Invalid email" without suggesting the correct format (e.g., "user@example.com")',
      '"Invalid date" without specifying the expected format (e.g., "MM/DD/YYYY")',
      '"Password too weak" without explaining the specific requirements',
    ],
  },
  {
    criterion: '3.3.4',
    name: 'Error Prevention (Legal, Financial, Data)',
    level: 'AA',
    principle: 'understandable',
    description: 'For pages that cause legal commitments or financial transactions, or that modify/delete user data, at least one of the following is true: submissions are reversible, data is checked for errors and the user can correct them, or a mechanism is available to review and confirm before submission.',
    testingMethod: 'Test financial transactions, account changes, and data deletion flows. Verify users can review entries before submission, correct errors, and/or reverse completed actions.',
    commonFailures: [
      'Purchase checkout with no order review step before final submission',
      'Account deletion without a confirmation step or grace period',
      'Data modification form with no chance to review changes before saving',
    ],
  },
  // ---------------------------------------------------------------------------
  // PRINCIPLE 4: ROBUST
  // ---------------------------------------------------------------------------
  {
    criterion: '4.1.1',
    name: 'Parsing',
    level: 'A',
    principle: 'robust',
    description: 'In content implemented using markup languages, elements have complete start and end tags, are nested according to specifications, do not contain duplicate attributes, and IDs are unique (Note: this criterion was deprecated in WCAG 2.2 but remains in 2.1).',
    testingMethod: 'Run the HTML through the W3C HTML Validator. Check for duplicate IDs, improperly nested elements, and malformed tags.',
    commonFailures: [
      'Duplicate id attributes on the same page',
      'Improperly nested elements (e.g., <a> inside <a>, <div> inside <p>)',
      'Unclosed or malformed HTML tags',
    ],
  },
  {
    criterion: '4.1.2',
    name: 'Name, Role, Value',
    level: 'A',
    principle: 'robust',
    description: 'For all user interface components, the name, role, and value can be programmatically determined; states, properties, and values that can be set by the user can be programmatically set; and notification of changes is available to user agents, including assistive technologies.',
    testingMethod: 'Inspect custom widgets with browser accessibility tools or a screen reader. Verify each has an accessible name, appropriate ARIA role, and correctly reported state/value.',
    commonFailures: [
      'Custom dropdown built with <div> elements without role="listbox" and role="option"',
      'Toggle button without aria-pressed reflecting its state',
      'Custom slider without role="slider" and aria-valuenow/min/max',
      'Tabs built without role="tab", role="tablist", role="tabpanel"',
    ],
  },
  {
    criterion: '4.1.3',
    name: 'Status Messages',
    level: 'AA',
    principle: 'robust',
    description: 'In content implemented using markup languages, status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus.',
    testingMethod: 'Trigger status messages (success confirmations, error alerts, search result counts, loading indicators). Verify they use role="status", role="alert", or aria-live regions and are announced by screen readers without stealing focus.',
    commonFailures: [
      'Toast notifications that are not in an aria-live region',
      'Search result counts that update visually but are not announced to screen readers',
      'Loading/progress messages not communicated to assistive technologies',
      'Error banners that appear visually but have no ARIA role for announcement',
    ],
  },
];

// =============================================================================
// 4. COMPONENT BLUEPRINTS
// =============================================================================
// Detailed specifications for 20 common UI components, covering required states,
// ARIA requirements, keyboard interaction, anatomy, spacing, color usage,
// and do's/don'ts. Based on WAI-ARIA Authoring Practices Guide and established
// design system patterns (Material, Carbon, Primer, GOV.UK).
// =============================================================================

export const COMPONENT_BLUEPRINTS: ComponentBlueprint[] = [
  {
    name: 'Button',
    requiredStates: ['default', 'hover', 'active/pressed', 'focus', 'disabled', 'loading'],
    ariaRequirements: [
      'Use <button> element (not <div> or <a>) for actions',
      'Icon-only buttons require aria-label describing the action',
      'Loading state uses aria-busy="true" and aria-disabled="true"',
      'Toggle buttons use aria-pressed="true"/"false"',
      'Disabled buttons use the disabled attribute (not just aria-disabled for native buttons)',
    ],
    keyboardInteraction: [
      'Enter and Space activate the button',
      'Tab moves focus to the next focusable element',
      'Disabled buttons remain focusable but do not activate (for discoverability)',
    ],
    anatomy: ['Label text', 'Optional leading icon', 'Optional trailing icon', 'Loading spinner (replaces content or icon)', 'Container/background'],
    spacingGuidelines: [
      'Horizontal padding: 16-24px (varies by size variant)',
      'Vertical padding: 8-12px (varies by size variant)',
      'Icon-to-label gap: 8px',
      'Minimum height: 36px (small), 40px (medium), 48px (large)',
      'Spacing between adjacent buttons: 8-12px',
    ],
    colorUsage: [
      'Primary: Brand color background with high-contrast text (white or dark)',
      'Secondary: Transparent/outlined with brand color text and border',
      'Destructive/Danger: Red-toned background for delete/destructive actions',
      'Ghost: Transparent background with text-color label; background appears on hover',
      'Disabled: Reduced opacity (0.4-0.5) or muted colors; maintain contrast ratio',
    ],
    dos: [
      'Use action verbs for labels ("Save changes", "Add to cart", "Delete")',
      'Maintain a consistent button hierarchy (one primary per section)',
      'Ensure minimum 44x44px touch target on mobile',
      'Show loading state for async actions to prevent double-clicks',
      'Place primary action buttons in a consistent position (right-aligned or full-width on mobile)',
    ],
    donts: [
      'Do not use more than one primary button in a single action group',
      'Do not disable buttons without explaining why (use a tooltip on the disabled button)',
      'Do not use generic labels like "Click here" or "Submit"',
      'Do not make buttons look like links or links look like buttons',
      'Do not remove focus outlines without providing a visible alternative',
    ],
  },
  {
    name: 'Checkbox',
    requiredStates: ['unchecked', 'checked', 'indeterminate', 'hover', 'focus', 'disabled', 'error'],
    ariaRequirements: [
      'Use native <input type="checkbox"> or role="checkbox" with aria-checked',
      'Indeterminate state uses aria-checked="mixed"',
      'Each checkbox has an associated <label> element or aria-label',
      'Checkbox groups wrapped in <fieldset> with <legend>',
      'Error state uses aria-invalid="true" with aria-describedby pointing to error message',
    ],
    keyboardInteraction: [
      'Space toggles the checkbox on/off',
      'Tab moves focus to the next focusable element',
      'In a group, Tab moves between checkboxes (or arrow keys if using roving tabindex)',
    ],
    anatomy: ['Checkbox input (visual box)', 'Check mark icon (for checked state)', 'Minus/dash icon (for indeterminate)', 'Label text', 'Optional helper text below label'],
    spacingGuidelines: [
      'Checkbox size: 16-20px',
      'Gap between checkbox and label: 8-12px',
      'Vertical spacing between checkbox items in a group: 8-12px',
      'Group label (legend) margin-bottom: 8px',
    ],
    colorUsage: [
      'Unchecked: Border color matching form input borders (neutral)',
      'Checked: Brand/primary color fill with white checkmark',
      'Indeterminate: Brand/primary color fill with white dash',
      'Focus: Visible focus ring using the standard focus indicator style',
      'Error: Red/error border color with error message below',
    ],
    dos: [
      'Use for independent, non-exclusive selections where multiple options can be selected',
      'Label each checkbox clearly with what selecting it means',
      'Use indeterminate state for "select all" when some children are selected',
      'Group related checkboxes with a <fieldset> and <legend>',
    ],
    donts: [
      'Do not use checkboxes for mutually exclusive options (use radio buttons)',
      'Do not use a checkbox for a binary on/off setting with immediate effect (use a toggle switch)',
      'Do not nest checkboxes more than one level deep',
      'Do not place the label to the left of the checkbox (convention is label on the right)',
    ],
  },
  {
    name: 'Radio Button',
    requiredStates: ['unselected', 'selected', 'hover', 'focus', 'disabled', 'error'],
    ariaRequirements: [
      'Use native <input type="radio"> or role="radio" within role="radiogroup"',
      'Selected radio has aria-checked="true", others have aria-checked="false"',
      'Radio group wrapped in <fieldset> with <legend> or role="radiogroup" with aria-label',
      'Error state uses aria-invalid="true" on the group with aria-describedby for error message',
    ],
    keyboardInteraction: [
      'Arrow keys (Up/Down or Left/Right) move selection between radio buttons in the group',
      'Tab moves focus into and out of the radio group as a single tab stop',
      'Space selects the focused radio button if not already selected',
      'Home/End move to first/last radio in the group',
    ],
    anatomy: ['Radio circle (outer ring)', 'Selected indicator (inner filled circle)', 'Label text', 'Optional description text below label'],
    spacingGuidelines: [
      'Radio size: 16-20px',
      'Gap between radio and label: 8-12px',
      'Vertical spacing between radio options: 8-12px',
      'Group label (legend) margin-bottom: 8px',
    ],
    colorUsage: [
      'Unselected: Neutral border, empty center',
      'Selected: Brand/primary color border and filled inner circle',
      'Focus: Visible focus ring around the radio circle',
      'Disabled: Reduced opacity, muted colors',
    ],
    dos: [
      'Use for mutually exclusive selections from a list of 2-7 options',
      'Always pre-select a default option when one is logical',
      'Order options logically (most common first, alphabetical, or by importance)',
      'Show all options visible at once (do not hide in a dropdown for fewer than 7 options)',
    ],
    donts: [
      'Do not use radio buttons for non-exclusive selections (use checkboxes)',
      'Do not allow zero selection unless there is an explicit "None" option',
      'Do not use radio buttons for more than 7 options (use a dropdown/select)',
      'Do not lay out radio buttons horizontally if labels are long (use vertical)',
    ],
  },
  {
    name: 'Switch / Toggle',
    requiredStates: ['off', 'on', 'hover', 'focus', 'disabled'],
    ariaRequirements: [
      'Use role="switch" with aria-checked="true"/"false"',
      'Has an accessible label via <label> element, aria-label, or aria-labelledby',
      'State change is communicated immediately to assistive technologies',
    ],
    keyboardInteraction: [
      'Space toggles the switch on/off',
      'Tab moves focus to the next element',
      'Enter should NOT toggle (distinguishes from button behavior)',
    ],
    anatomy: ['Track (background bar)', 'Thumb/knob (sliding indicator)', 'On/Off label or icon', 'External label text describing the setting'],
    spacingGuidelines: [
      'Track width: 36-52px',
      'Track height: 20-28px',
      'Thumb diameter: 16-24px (slightly smaller than track height)',
      'Gap between switch and label: 8-12px',
    ],
    colorUsage: [
      'Off: Neutral gray track with positioned-left thumb',
      'On: Brand/success green track with positioned-right thumb',
      'Focus: Visible focus ring around the switch track',
      'Disabled: Reduced opacity (0.4) for both track and thumb',
    ],
    dos: [
      'Use for binary settings that take effect immediately',
      'Include visible on/off labels or visual state indicators beyond color',
      'Animate the thumb sliding between positions (150-200ms)',
      'Clearly indicate which end is "on" and which is "off"',
    ],
    donts: [
      'Do not use for form fields that require explicit submission',
      'Do not use when the effect of toggling is not immediate and obvious',
      'Do not rely solely on color to indicate state (position and label matter)',
      'Do not make the switch too small to tap (minimum 44x44px touch target area)',
    ],
  },
  {
    name: 'Tabs',
    requiredStates: ['default/inactive', 'active/selected', 'hover', 'focus', 'disabled'],
    ariaRequirements: [
      'Tab list uses role="tablist"',
      'Each tab uses role="tab" with aria-selected="true"/"false"',
      'Each panel uses role="tabpanel" with aria-labelledby pointing to its tab',
      'Each tab has aria-controls pointing to its panel id',
      'The tablist has an accessible name via aria-label or aria-labelledby',
    ],
    keyboardInteraction: [
      'Left/Right arrow keys move between tabs (horizontal tabs)',
      'Up/Down arrow keys move between tabs (vertical tabs)',
      'Tab key moves focus from the active tab into the tabpanel content',
      'Home/End keys jump to first/last tab',
      'Space or Enter activates the focused tab (if using manual activation mode)',
    ],
    anatomy: ['Tab list container', 'Individual tab items', 'Active tab indicator (underline, background, or border)', 'Tab panel content area', 'Optional tab icons'],
    spacingGuidelines: [
      'Tab horizontal padding: 16-24px',
      'Tab height: 40-48px',
      'Gap between tabs: 0-4px (depends on style)',
      'Tab panel padding-top: 16-24px from the tab list',
      'Active indicator height: 2-3px',
    ],
    colorUsage: [
      'Active tab: Brand/primary color text or indicator; prominent background or underline',
      'Inactive tab: Neutral text color, no indicator',
      'Hover: Subtle background change on inactive tabs',
      'Focus: Visible focus ring on the focused tab',
      'Disabled: Reduced opacity, no hover state',
    ],
    dos: [
      'Use for 2-7 parallel content sections on the same page',
      'Keep tab labels short and descriptive (1-2 words)',
      'Show the active tab indicator clearly with more than just color',
      'Lazy-load tab panel content if it is expensive to render',
    ],
    donts: [
      'Do not use tabs for sequential content that must be viewed in order',
      'Do not nest tabs within tabs (creates confusion)',
      'Do not use more than 7 tabs (consider alternative navigation)',
      'Do not truncate tab labels (shorten the text or use a different pattern)',
    ],
  },
  {
    name: 'Text Field / Input',
    requiredStates: ['default/empty', 'hover', 'focus', 'filled', 'disabled', 'read-only', 'error', 'success'],
    ariaRequirements: [
      'Has an associated <label> element via for/id or wrapping',
      'Helper text connected via aria-describedby',
      'Error state uses aria-invalid="true" with error message via aria-describedby',
      'Required fields use the required attribute or aria-required="true"',
      'Autocomplete attributes set for personal data fields (autocomplete="email", etc.)',
    ],
    keyboardInteraction: [
      'Tab to focus the input',
      'Standard text editing keys (typing, selection, clipboard)',
      'Escape to clear input or close autocomplete suggestions (optional)',
      'Enter to submit in single-field forms',
    ],
    anatomy: ['Label (above or beside)', 'Input container/border', 'Input text', 'Placeholder text (optional, supplementary)', 'Helper/hint text (below)', 'Error message (below, replaces helper)', 'Leading icon (optional)', 'Trailing icon or action (optional, e.g., clear, visibility toggle)'],
    spacingGuidelines: [
      'Input height: 36px (small), 40px (medium), 48px (large)',
      'Horizontal padding inside input: 12-16px',
      'Label margin-bottom: 4-8px',
      'Helper/error text margin-top: 4px',
      'Spacing between stacked fields: 16-24px',
    ],
    colorUsage: [
      'Default border: Neutral gray',
      'Focus border: Brand/primary color with optional glow/ring',
      'Error border: Red/error color',
      'Success border: Green/success color (use sparingly)',
      'Disabled: Muted background and reduced contrast border',
      'Placeholder: Lighter text color (must still meet contrast minimum or note it is supplementary)',
    ],
    dos: [
      'Always use a visible <label>, never rely solely on placeholder text',
      'Show validation feedback inline and adjacent to the field',
      'Use the appropriate input type (email, tel, number, url, password)',
      'Set autocomplete attributes for personal information fields',
      'Indicate required fields with text "(required)" or an asterisk with a legend',
    ],
    donts: [
      'Do not use placeholder text as the only label',
      'Do not remove the input border (makes it hard to identify the field)',
      'Do not use input masks that prevent valid entries or confuse users',
      'Do not show error messages before the user has interacted with the field',
      'Do not auto-format input in ways that conflict with user expectations',
    ],
  },
  {
    name: 'Select / Dropdown',
    requiredStates: ['default/closed', 'open/expanded', 'option-hover', 'option-selected', 'focus', 'disabled', 'error'],
    ariaRequirements: [
      'Native <select> is preferred for accessibility; custom dropdowns need full ARIA',
      'Custom: trigger uses role="combobox" or button with aria-haspopup="listbox" and aria-expanded',
      'Listbox uses role="listbox" with role="option" for each item',
      'Selected option indicated with aria-selected="true"',
      'Multi-select uses aria-multiselectable="true" on the listbox',
    ],
    keyboardInteraction: [
      'Enter/Space or ArrowDown opens the dropdown when focused',
      'ArrowUp/Down navigates options within the open listbox',
      'Enter selects the highlighted option and closes the dropdown',
      'Escape closes the dropdown without changing the selection',
      'Type-ahead: typing a letter jumps to the first option starting with that letter',
      'Home/End jump to first/last option',
    ],
    anatomy: ['Select trigger/button', 'Selected value display', 'Dropdown arrow icon', 'Options listbox container', 'Individual option items', 'Option groups with labels (optional)', 'Search/filter input within dropdown (optional)'],
    spacingGuidelines: [
      'Trigger height matches text field height (36-48px)',
      'Option item height: 36-44px',
      'Option horizontal padding: 12-16px',
      'Dropdown max-height: ~300px with scrolling',
      'Gap between trigger and dropdown panel: 4px',
    ],
    colorUsage: [
      'Trigger: Same styling as text fields for visual consistency',
      'Open state: Elevated dropdown with shadow',
      'Highlighted option: Light primary/brand background color',
      'Selected option: Checkmark icon or primary color indicator',
      'Disabled option: Reduced opacity text',
    ],
    dos: [
      'Use native <select> for simple cases with fewer than 10 options',
      'Include a neutral placeholder option ("Select an option...") if no default is logical',
      'Support type-ahead search for long option lists',
      'Group related options with <optgroup> or role="group" with labels',
    ],
    donts: [
      'Do not use a custom dropdown if a native <select> would suffice',
      'Do not nest selects within other selects',
      'Do not auto-submit the form when a selection is made without warning',
      'Do not use a dropdown for fewer than 3 options (use radio buttons)',
      'Do not use a dropdown for more than 15 ungrouped options without search (use an autocomplete)',
    ],
  },
  {
    name: 'Modal / Dialog',
    requiredStates: ['closed', 'opening (animation)', 'open', 'closing (animation)'],
    ariaRequirements: [
      'Uses role="dialog" (informational) or role="alertdialog" (requires acknowledgment)',
      'Has aria-modal="true" to indicate background is inert',
      'Title provided via aria-labelledby pointing to the heading element',
      'Description provided via aria-describedby if applicable',
      'Background content is inert (inert attribute or aria-hidden on root)',
    ],
    keyboardInteraction: [
      'Focus is trapped within the modal (Tab cycles through modal\'s focusable elements)',
      'Escape closes the modal',
      'On open: focus moves to the first focusable element or the modal container',
      'On close: focus returns to the element that triggered the modal',
    ],
    anatomy: ['Backdrop overlay (semi-transparent)', 'Modal container', 'Header with title and close button', 'Body content area (scrollable)', 'Footer with action buttons'],
    spacingGuidelines: [
      'Modal padding: 24px',
      'Header bottom border or margin-bottom: 16px',
      'Footer top border or margin-top: 16px',
      'Max width: 480px (small), 640px (medium), 800px (large)',
      'Max height: 80vh with body scrolling',
      'Close button: 44x44px touch target in top-right corner',
    ],
    colorUsage: [
      'Backdrop: Black with 40-60% opacity',
      'Modal background: White or surface color',
      'Close button: Neutral icon, brand/primary on hover',
      'Primary action: Brand color button in the footer',
      'Destructive action: Red/danger color for delete/discard actions',
    ],
    dos: [
      'Use for content that requires immediate attention or a decision before proceeding',
      'Include a visible close button and Escape key dismissal',
      'Keep modal content focused and concise',
      'Use the <dialog> HTML element with showModal() for native modal behavior',
      'Animate opening (fade in + scale up) and closing (fade out)',
    ],
    donts: [
      'Do not open modals on page load without explicit user action (except critical alerts)',
      'Do not nest modals within modals',
      'Do not use modals for content that users need to reference alongside other page content',
      'Do not allow scrolling of the background content while the modal is open',
      'Do not use modals for simple confirmations that could be handled by inline UI',
    ],
  },
  {
    name: 'Card',
    requiredStates: ['default', 'hover (if interactive)', 'focus (if interactive)', 'selected (if selectable)', 'loading/skeleton'],
    ariaRequirements: [
      'If the entire card is a link: wrap content in a single <a> or use a click handler with keyboard support',
      'If card has multiple actions: each action must be individually focusable',
      'Card images have descriptive alt text',
      'Card heading uses proper heading level in document hierarchy',
      'Selected cards use aria-selected="true" or aria-checked="true"',
    ],
    keyboardInteraction: [
      'If entire card is clickable: Enter activates the card link/action',
      'Tab moves between cards and between interactive elements within cards',
      'If selectable: Space toggles selection',
    ],
    anatomy: ['Card container (with border or shadow)', 'Media area (image, video, or illustration)', 'Header (title, subtitle)', 'Body (description text)', 'Footer (actions, metadata, tags)'],
    spacingGuidelines: [
      'Card padding: 16-24px',
      'Image aspect ratio: 16:9, 4:3, or 1:1 depending on content',
      'Title margin-bottom: 4-8px',
      'Body margin-bottom: 12-16px',
      'Gap between cards in a grid: 16-24px',
    ],
    colorUsage: [
      'Default: White/surface background with subtle border or shadow',
      'Hover: Slight elevation increase (stronger shadow) or subtle background change',
      'Selected: Primary/brand color border or left accent bar',
      'Skeleton: Light gray background shapes matching content layout',
    ],
    dos: [
      'Keep card content concise and scannable',
      'Use consistent card dimensions within a grid for visual harmony',
      'Lazy-load card images below the fold',
      'Make the entire card clickable for single-action cards (with a single underlying link)',
    ],
    donts: [
      'Do not overload cards with too many actions or too much text',
      'Do not mix card sizes inconsistently in the same grid row',
      'Do not use multiple overlapping click targets within a card',
      'Do not omit alt text on card images',
    ],
  },
  {
    name: 'Data Table',
    requiredStates: ['default', 'loading', 'empty', 'error', 'row-hover', 'row-selected', 'column-sorted', 'row-expanded'],
    ariaRequirements: [
      'Use semantic <table>, <thead>, <tbody>, <th>, <td> elements',
      'Column headers use scope="col"; row headers use scope="row"',
      'Sortable columns use aria-sort="ascending", "descending", or "none"',
      'Table has an accessible name via <caption> or aria-label',
      'Selected rows use aria-selected="true"',
      'Expandable rows use aria-expanded on the toggle control',
    ],
    keyboardInteraction: [
      'Tab moves between interactive elements in cells (links, buttons, checkboxes)',
      'Arrow keys navigate between cells (for grid-like tables with role="grid")',
      'Enter activates sortable column headers or row expand toggles',
      'Space selects/deselects rows (if row selection is enabled)',
    ],
    anatomy: ['Table header row(s)', 'Column header cells with sort controls', 'Data rows', 'Data cells', 'Checkbox column (for selection)', 'Expand/collapse control column', 'Pagination controls', 'Toolbar (filters, search, bulk actions)'],
    spacingGuidelines: [
      'Cell padding: 8-16px horizontal, 8-12px vertical',
      'Row height: 40-52px (depending on density setting)',
      'Header row height: 44-56px',
      'Table max-height: fit viewport with sticky header',
    ],
    colorUsage: [
      'Header: Slightly darker or bolder background than data rows',
      'Alternating rows: Subtle zebra striping (optional) for readability',
      'Row hover: Light highlight background',
      'Row selected: Light primary/brand color background',
      'Sort indicator: Icon color change on the sorted column',
    ],
    dos: [
      'Right-align numeric data for easy comparison',
      'Provide column sorting for data that users compare across rows',
      'Include pagination or virtual scrolling for large data sets',
      'Show an empty state with guidance when no data is available',
      'Support column resizing for dense tables',
    ],
    donts: [
      'Do not use tables for layout purposes (only for tabular data)',
      'Do not wrap long cell content excessively (truncate with tooltip or expand)',
      'Do not make tables wider than the viewport without horizontal scrolling support',
      'Do not remove column headers or header borders',
    ],
  },
  {
    name: 'Navigation Bar',
    requiredStates: ['default', 'scrolled/sticky', 'mobile-menu-open', 'mobile-menu-closed', 'dropdown-open'],
    ariaRequirements: [
      'Wrapped in a <nav> element with aria-label (e.g., "Main navigation")',
      'Active/current page link uses aria-current="page"',
      'Mobile menu toggle uses aria-expanded and aria-controls',
      'Dropdown triggers use aria-expanded and aria-haspopup',
    ],
    keyboardInteraction: [
      'Tab moves between top-level navigation links',
      'Enter activates links',
      'ArrowDown opens dropdown menus from top-level items',
      'Escape closes dropdown menus and returns focus to trigger',
      'ArrowUp/Down navigates within open dropdown menus',
    ],
    anatomy: ['Nav container', 'Logo/brand mark (link to home)', 'Primary navigation links', 'Dropdown menus', 'CTA button(s)', 'Mobile menu toggle (hamburger)', 'Mobile menu overlay/drawer'],
    spacingGuidelines: [
      'Nav height: 56-72px',
      'Logo size: 24-40px height',
      'Nav link horizontal padding: 12-16px',
      'Nav link vertical padding: auto (centered in nav height)',
      'Gap between nav links: 4-8px',
      'Mobile menu item height: 44-52px',
    ],
    colorUsage: [
      'Background: White/surface or brand color',
      'Link text: Neutral dark or brand-contrasting color',
      'Active link: Brand/primary color with indicator (underline, background, or weight)',
      'Hover: Subtle background change or color shift',
      'Mobile overlay: Semi-transparent black backdrop',
    ],
    dos: [
      'Keep primary nav items to 5-8 maximum',
      'Highlight the current page clearly in the navigation',
      'Include a skip-to-content link as the first focusable element',
      'Make the logo a link back to the home page',
    ],
    donts: [
      'Do not use more than one level of dropdown on desktop navigation',
      'Do not hide critical navigation items behind a hamburger on desktop',
      'Do not use hover-only dropdowns without click support',
      'Do not forget to add aria-current="page" on the active link',
    ],
  },
  {
    name: 'Breadcrumb',
    requiredStates: ['default', 'truncated (for deep paths)'],
    ariaRequirements: [
      'Wrapped in <nav> with aria-label="Breadcrumb"',
      'Uses <ol> for ordered list semantics',
      'Current/last item uses aria-current="page"',
      'Separator characters use aria-hidden="true"',
    ],
    keyboardInteraction: [
      'Tab moves between breadcrumb links',
      'Enter activates breadcrumb links',
      'Current page item is not a link (plain text)',
    ],
    anatomy: ['<nav> container', 'Ordered list <ol>', 'Breadcrumb items <li>', 'Links for parent pages', 'Text-only current page', 'Separator icons (CSS or aria-hidden spans)'],
    spacingGuidelines: [
      'Font size: 13-14px (typically smaller than body text)',
      'Gap between items: 4-8px on each side of separator',
      'Separator icon size: 12-16px',
      'Vertical margin: 8-16px above/below',
    ],
    colorUsage: [
      'Link items: Standard link color (brand or blue)',
      'Current page: Neutral/dark text (non-clickable appearance)',
      'Separator: Neutral/muted gray',
    ],
    dos: [
      'Show the full path from home to current page',
      'Make all items except the current page clickable links',
      'Use right-pointing chevrons or slashes as separators',
      'Truncate middle items with ellipsis for very deep paths',
    ],
    donts: [
      'Do not use breadcrumbs as the primary navigation',
      'Do not make the current page item a clickable link',
      'Do not use breadcrumbs on the home page',
      'Do not include breadcrumbs if the site has fewer than 3 levels',
    ],
  },
  {
    name: 'Pagination',
    requiredStates: ['default', 'first-page (prev disabled)', 'last-page (next disabled)', 'page-hover', 'page-active/current'],
    ariaRequirements: [
      'Wrapped in <nav> with aria-label="Pagination"',
      'Current page uses aria-current="page"',
      'Disabled prev/next buttons use aria-disabled="true"',
      'Each page link has aria-label="Page N" or "Go to page N"',
    ],
    keyboardInteraction: [
      'Tab moves between pagination links/buttons',
      'Enter activates the focused page link',
    ],
    anatomy: ['Previous button', 'First page link', 'Ellipsis (for gaps)', 'Surrounding page links', 'Current page indicator', 'Last page link', 'Next button', 'Optional: Items per page selector', 'Optional: Total count display'],
    spacingGuidelines: [
      'Page button size: 32-40px square (minimum 44px touch target including spacing)',
      'Gap between page buttons: 4-8px',
      'Margin above pagination: 24-32px from content',
    ],
    colorUsage: [
      'Default page: Neutral text, transparent background',
      'Hover: Light background fill',
      'Current page: Brand/primary color background with white text',
      'Disabled: Reduced opacity, no hover cursor',
    ],
    dos: [
      'Show first, last, current, and surrounding pages',
      'Use ellipsis for gaps in the page range',
      'Display the total item count and current range',
      'Include "Items per page" selector for user control',
    ],
    donts: [
      'Do not show all page numbers for large sets (use truncation with ellipsis)',
      'Do not use pagination for content that is primarily browsed casually (use infinite scroll)',
      'Do not reset the scroll position without scrolling to the top of results',
    ],
  },
  {
    name: 'Badge',
    requiredStates: ['default', 'dot-only (no count)', 'with-count', 'overflow (99+)'],
    ariaRequirements: [
      'Badge count is communicated to screen readers via aria-label on the parent element',
      'Decorative badges (no count, purely visual) use aria-hidden="true"',
      'Dynamic badge counts update in an aria-live region or via updated aria-label',
    ],
    keyboardInteraction: [
      'Badges themselves are not interactive; the parent element handles keyboard interaction',
    ],
    anatomy: ['Badge container (circle or rounded rectangle)', 'Count text', 'Parent element (icon, avatar, or button)'],
    spacingGuidelines: [
      'Dot badge size: 8-12px diameter',
      'Count badge height: 16-20px, min-width equal to height',
      'Padding inside count badge: 0 4px (for wider numbers)',
      'Position: Overlapping the top-right corner of the parent element',
    ],
    colorUsage: [
      'Notification badge: Red/danger for unread count',
      'Status badge: Green (active/online), yellow (away), gray (offline)',
      'Neutral badge: Gray for informational counts',
    ],
    dos: [
      'Truncate large numbers (show "99+" for counts above 99)',
      'Position consistently in the top-right corner of the parent element',
      'Use a dot-only variant when the exact count is not important',
      'Ensure the count text is readable (white on colored background)',
    ],
    donts: [
      'Do not use badges for purely decorative purposes where the count is meaningless',
      'Do not show a badge count of 0 (hide the badge instead)',
      'Do not make badges interactive (they indicate state, not action)',
    ],
  },
  {
    name: 'Avatar',
    requiredStates: ['with-image', 'with-initials (fallback)', 'with-icon (generic fallback)', 'loading/skeleton'],
    ariaRequirements: [
      'Image avatar uses alt text with the person\'s name',
      'Decorative avatars (in a list where the name is already shown) use alt=""',
      'If the avatar is a link to a profile, the link has an accessible name',
    ],
    keyboardInteraction: [
      'If the avatar is a link or button: Tab to focus, Enter to activate',
      'If the avatar is decorative: not focusable, skipped by Tab',
    ],
    anatomy: ['Container (circle or rounded square)', 'Image / Initials text / Fallback icon', 'Optional status indicator (badge dot)', 'Optional ring/border'],
    spacingGuidelines: [
      'Sizes: 24px (xs), 32px (sm), 40px (md), 48px (lg), 64px (xl)',
      'Group overlap: 8-12px negative margin between stacked avatars',
      'Status indicator size: 25-30% of avatar diameter',
    ],
    colorUsage: [
      'Image: Fills the circle/square completely',
      'Initials fallback: Colored background (deterministic based on name hash) with white text',
      'Icon fallback: Neutral gray background with darker gray icon',
      'Ring/border: White ring for separation in groups; brand color ring for emphasis',
    ],
    dos: [
      'Use initials as the first fallback when no image is available',
      'Use a generic person icon as the ultimate fallback',
      'Show a status indicator (online/offline) if relevant to the context',
      'Crop images to fill the container maintaining aspect ratio',
    ],
    donts: [
      'Do not stretch or distort avatar images',
      'Do not use more than 2 initials (first and last name)',
      'Do not use random colors for initials backgrounds (derive from the name for consistency)',
    ],
  },
  {
    name: 'Toast / Snackbar',
    requiredStates: ['entering', 'visible', 'exiting', 'dismissed'],
    ariaRequirements: [
      'Uses role="status" for informational messages, role="alert" for errors or warnings',
      'Content area is within an aria-live="polite" (info) or aria-live="assertive" (error) region',
      'Does not steal focus from the user\'s current task',
      'Dismiss button has an accessible label (e.g., "Dismiss notification")',
    ],
    keyboardInteraction: [
      'Focus should NOT move to the toast automatically',
      'Dismiss button is focusable via Tab if the user navigates to it',
      'Action button (e.g., "Undo") is focusable and activatable',
    ],
    anatomy: ['Toast container', 'Status icon (success, error, warning, info)', 'Message text', 'Optional action button ("Undo", "View")', 'Dismiss button (X)'],
    spacingGuidelines: [
      'Padding: 12-16px',
      'Min width: 300px, Max width: 560px',
      'Icon size: 20-24px',
      'Gap between icon, text, and actions: 8-12px',
      'Stack gap between multiple toasts: 8px',
      'Margin from viewport edge: 16-24px',
    ],
    colorUsage: [
      'Success: Green accent (left border, icon)',
      'Error: Red accent',
      'Warning: Yellow/amber accent',
      'Info: Blue accent or neutral',
      'Background: White or dark surface (inverted theme)',
    ],
    dos: [
      'Auto-dismiss informational toasts after 5-8 seconds',
      'Never auto-dismiss error toasts (require manual dismissal)',
      'Stack multiple toasts vertically with consistent positioning',
      'Include an "Undo" action for reversible operations',
      'Limit the maximum number of visible toasts to 3-5',
    ],
    donts: [
      'Do not use toasts for critical errors that require user action (use a dialog)',
      'Do not auto-dismiss too quickly (minimum 5 seconds)',
      'Do not stack more than 5 toasts (it overwhelms the user)',
      'Do not position toasts where they cover important interactive elements',
    ],
  },
  {
    name: 'Tooltip',
    requiredStates: ['hidden', 'visible', 'positioned (top/right/bottom/left)'],
    ariaRequirements: [
      'Tooltip element uses role="tooltip"',
      'Trigger element uses aria-describedby pointing to the tooltip id',
      'Tooltip appears on both mouse hover and keyboard focus of the trigger',
      'Tooltip is dismissible with the Escape key (WCAG 1.4.13)',
      'Tooltip content is plain text only (no interactive elements)',
    ],
    keyboardInteraction: [
      'Tooltip appears when trigger receives keyboard focus',
      'Tooltip disappears when trigger loses focus',
      'Escape key dismisses the tooltip while keeping focus on the trigger',
    ],
    anatomy: ['Tooltip container (floating box)', 'Text content', 'Arrow/caret pointing to trigger', 'Trigger element (icon, button, text)'],
    spacingGuidelines: [
      'Padding: 4-8px horizontal, 4-6px vertical',
      'Max width: 240-300px',
      'Gap between tooltip and trigger: 4-8px',
      'Arrow size: 6-8px',
      'Font size: 12-14px (typically smaller than body text)',
    ],
    colorUsage: [
      'Background: Dark (gray-900 or black) with high contrast text (white)',
      'Or inverted: Light background with dark text (matches design system theme)',
      'Arrow: Same color as tooltip background',
    ],
    dos: [
      'Keep content concise (1-2 short sentences maximum)',
      'Show on hover (with 200-400ms delay) and on keyboard focus (no delay)',
      'Use for supplementary information, not essential content',
      'Position dynamically to stay within the viewport',
    ],
    donts: [
      'Do not put interactive elements (links, buttons) inside a tooltip',
      'Do not use tooltips on touch devices as the primary information delivery (provide inline text)',
      'Do not make tooltip content essential for task completion',
      'Do not use tooltips on elements that have visible labels already',
    ],
  },
  {
    name: 'Accordion',
    requiredStates: ['collapsed', 'expanded', 'hover (on header)', 'focus (on header)', 'disabled'],
    ariaRequirements: [
      'Headers are <button> elements (or elements with role="button")',
      'Header buttons use aria-expanded="true"/"false"',
      'Header buttons use aria-controls pointing to the panel element id',
      'Panels use role="region" with aria-labelledby pointing to the header button',
    ],
    keyboardInteraction: [
      'Enter/Space toggles the accordion section open/closed',
      'ArrowDown moves focus to the next accordion header',
      'ArrowUp moves focus to the previous accordion header',
      'Home moves focus to the first accordion header',
      'End moves focus to the last accordion header',
      'Tab moves focus into the expanded panel content, then to the next header',
    ],
    anatomy: ['Accordion container', 'Header/trigger button per section', 'Expand/collapse icon (chevron or plus/minus)', 'Content panel per section', 'Optional divider between sections'],
    spacingGuidelines: [
      'Header height: 44-56px',
      'Header horizontal padding: 16-24px',
      'Panel padding: 16-24px',
      'Divider: 1px border between sections',
    ],
    colorUsage: [
      'Header: Neutral background or transparent',
      'Header hover: Slight background change',
      'Expand icon: Neutral color, rotates 90-180 degrees on expand',
      'Panel: Same background as page or slightly inset',
    ],
    dos: [
      'Use <button> elements for headers to ensure keyboard accessibility',
      'Animate the expand/collapse with smooth height transition',
      'Show a visual indicator (chevron) of expanded/collapsed state',
      'Default-expand the first or most important section',
    ],
    donts: [
      'Do not use <a> tags for accordion headers (they are not links)',
      'Do not nest accordions more than one level deep',
      'Do not use an accordion if users need to see all sections at once',
      'Do not auto-collapse other sections when one is opened (unless single-open is explicitly required)',
    ],
  },
  {
    name: 'Progress Bar',
    requiredStates: ['empty (0%)', 'in-progress', 'complete (100%)', 'indeterminate', 'error'],
    ariaRequirements: [
      'Uses role="progressbar" with aria-valuenow, aria-valuemin="0", aria-valuemax="100"',
      'Has an accessible label via aria-label or aria-labelledby',
      'Indeterminate progress uses aria-valuetext="Loading..." (no aria-valuenow)',
      'Updates are announced to screen readers at meaningful intervals (not every frame)',
    ],
    keyboardInteraction: [
      'Progress bars are not interactive; no keyboard interaction required',
      'Associated cancel button (if any) is keyboard accessible',
    ],
    anatomy: ['Track (background bar)', 'Fill (progress indicator)', 'Optional label text (percentage or step)', 'Optional cancel button for ongoing operations'],
    spacingGuidelines: [
      'Bar height: 4-8px (subtle) or 8-12px (prominent)',
      'Border radius: Fully rounded (pill shape)',
      'Label position: Above, below, or inside the bar',
      'Margin from related content: 8-16px',
    ],
    colorUsage: [
      'Track: Light gray or neutral background',
      'Fill: Brand/primary color for normal progress',
      'Complete: Green/success color at 100%',
      'Error: Red/error color if the process failed',
      'Indeterminate: Animated stripe or shimmer on the fill',
    ],
    dos: [
      'Show percentage or step count alongside the bar for determinate progress',
      'Use smooth animation for fill transitions',
      'Consider showing estimated time remaining for long operations',
      'Provide a cancel button for abortable operations',
    ],
    donts: [
      'Do not use a progress bar for operations that complete in under 1 second (use spinner or nothing)',
      'Do not animate backward (decreasing progress confuses users)',
      'Do not show progress without indicating what is being processed',
    ],
  },
  {
    name: 'Skeleton Loader',
    requiredStates: ['loading', 'loaded (replaced with real content)'],
    ariaRequirements: [
      'Skeleton elements use aria-hidden="true" (they are visual placeholders)',
      'The loading region uses aria-busy="true" while content is loading',
      'A text-based loading message is provided via an aria-live="polite" region for screen readers',
      'When loading completes, aria-busy is set to "false"',
    ],
    keyboardInteraction: [
      'Skeleton loaders are not interactive; focus should move to the real content when it loads',
    ],
    anatomy: ['Container matching the final layout dimensions', 'Rectangular shapes for text lines', 'Circle shapes for avatars', 'Rectangular shapes for images', 'Subtle shimmer animation overlay'],
    spacingGuidelines: [
      'Match the spacing of the final content layout exactly',
      'Text skeleton line height: match body text line-height',
      'Spacing between skeleton lines: match paragraph spacing',
      'Image skeleton: match the image aspect ratio',
    ],
    colorUsage: [
      'Background: Light gray (#E5E7EB or equivalent neutral-200)',
      'Shimmer highlight: Slightly lighter gray sweeping across (#F3F4F6)',
      'Animation: Left-to-right shimmer at 1.5-2s cycle',
    ],
    dos: [
      'Match skeleton shapes to the actual content layout closely',
      'Use a subtle shimmer or pulse animation to indicate loading activity',
      'Show skeleton for a minimum of 300ms to avoid jarring flash',
      'Respect prefers-reduced-motion by using static gray instead of animation',
    ],
    donts: [
      'Do not show skeleton for content that loads in under 300ms',
      'Do not use the same generic skeleton for all content types (customize per component)',
      'Do not forget to announce loading state to screen readers',
      'Do not abruptly swap skeleton for content (use a smooth fade transition)',
    ],
  },
];

// =============================================================================
// 5. DESIGN TOKEN SPECIFICATION
// =============================================================================
// Standard token categories following the W3C Design Tokens Community Group
// format. Defines the canonical set of token categories with naming conventions,
// scale patterns, and recommended values.
// =============================================================================

export const DESIGN_TOKEN_SPEC: DesignTokenSpec = {
  color: {
    name: 'Color',
    description: 'Color tokens organized into three tiers: primitive (raw palette), semantic (role-based), and component (specific component overrides). Primitive tokens define the raw color scale; semantic tokens reference primitives by role.',
    tokens: [
      // Primitive palette (brand)
      { name: 'color.primary.50', value: '#EFF6FF', description: 'Lightest primary tint, used for backgrounds and subtle highlights' },
      { name: 'color.primary.100', value: '#DBEAFE', description: 'Light primary tint, used for hover backgrounds' },
      { name: 'color.primary.200', value: '#BFDBFE', description: 'Lighter primary, used for focus rings or active backgrounds' },
      { name: 'color.primary.300', value: '#93C5FD', description: 'Medium-light primary' },
      { name: 'color.primary.400', value: '#60A5FA', description: 'Medium primary' },
      { name: 'color.primary.500', value: '#3B82F6', description: 'Base primary color, used for primary buttons and links' },
      { name: 'color.primary.600', value: '#2563EB', description: 'Darker primary, used for hover states on primary elements' },
      { name: 'color.primary.700', value: '#1D4ED8', description: 'Dark primary, used for active/pressed states' },
      { name: 'color.primary.800', value: '#1E40AF', description: 'Very dark primary' },
      { name: 'color.primary.900', value: '#1E3A8A', description: 'Darkest primary, used for text on light backgrounds' },
      { name: 'color.primary.950', value: '#172554', description: 'Near-black primary, used for high-emphasis text' },
      // Neutral palette
      { name: 'color.neutral.0', value: '#FFFFFF', description: 'Pure white, page backgrounds' },
      { name: 'color.neutral.50', value: '#F9FAFB', description: 'Off-white, subtle section backgrounds' },
      { name: 'color.neutral.100', value: '#F3F4F6', description: 'Light gray, card backgrounds, input backgrounds' },
      { name: 'color.neutral.200', value: '#E5E7EB', description: 'Borders, dividers, skeleton backgrounds' },
      { name: 'color.neutral.300', value: '#D1D5DB', description: 'Disabled text, placeholder text' },
      { name: 'color.neutral.400', value: '#9CA3AF', description: 'Muted text, secondary icons' },
      { name: 'color.neutral.500', value: '#6B7280', description: 'Secondary text, labels' },
      { name: 'color.neutral.600', value: '#4B5563', description: 'Body text (standard)' },
      { name: 'color.neutral.700', value: '#374151', description: 'Primary text, headings' },
      { name: 'color.neutral.800', value: '#1F2937', description: 'High-emphasis text' },
      { name: 'color.neutral.900', value: '#111827', description: 'Maximum emphasis text' },
      { name: 'color.neutral.950', value: '#030712', description: 'Near-black, used for dark mode backgrounds' },
      // Semantic colors
      { name: 'color.success.500', value: '#22C55E', description: 'Success state base color (confirmations, valid states)' },
      { name: 'color.warning.500', value: '#F59E0B', description: 'Warning state base color (caution notices)' },
      { name: 'color.error.500', value: '#EF4444', description: 'Error state base color (validation errors, destructive actions)' },
      { name: 'color.info.500', value: '#3B82F6', description: 'Informational state base color (notices, tips)' },
    ],
  },
  typography: {
    name: 'Typography',
    description: 'Typographic scale tokens defining font families, sizes, weights, line heights, and letter spacing. Uses a modular scale ratio for consistent visual rhythm.',
    tokens: [
      // Font family
      { name: 'font.family.sans', value: 'Inter, system-ui, -apple-system, sans-serif', description: 'Primary sans-serif font stack' },
      { name: 'font.family.serif', value: 'Georgia, Cambria, "Times New Roman", serif', description: 'Serif font stack for editorial or formal content' },
      { name: 'font.family.mono', value: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace', description: 'Monospace font for code blocks and data' },
      // Font size scale (major third ratio ~1.25)
      { name: 'font.size.xs', value: '0.75rem', description: '12px - Captions, badges, small labels' },
      { name: 'font.size.sm', value: '0.875rem', description: '14px - Secondary text, form helper text' },
      { name: 'font.size.base', value: '1rem', description: '16px - Body text, form inputs, buttons' },
      { name: 'font.size.lg', value: '1.125rem', description: '18px - Large body text, card titles' },
      { name: 'font.size.xl', value: '1.25rem', description: '20px - Section headings (h4 level)' },
      { name: 'font.size.2xl', value: '1.5rem', description: '24px - Sub-headings (h3 level)' },
      { name: 'font.size.3xl', value: '1.875rem', description: '30px - Page headings (h2 level)' },
      { name: 'font.size.4xl', value: '2.25rem', description: '36px - Page titles (h1 level)' },
      { name: 'font.size.5xl', value: '3rem', description: '48px - Hero headings, display text' },
      { name: 'font.size.6xl', value: '3.75rem', description: '60px - Large display text, hero numbers' },
      // Font weight
      { name: 'font.weight.normal', value: '400', description: 'Body text, descriptions' },
      { name: 'font.weight.medium', value: '500', description: 'Labels, table headers, emphasized text' },
      { name: 'font.weight.semibold', value: '600', description: 'Subheadings, card titles, button text' },
      { name: 'font.weight.bold', value: '700', description: 'Headings, strong emphasis' },
      { name: 'font.weight.extrabold', value: '800', description: 'Display headings, hero text' },
      // Line height
      { name: 'font.lineHeight.tight', value: '1.1', description: 'Display/hero headings only' },
      { name: 'font.lineHeight.snug', value: '1.3', description: 'Headings (h1-h3)' },
      { name: 'font.lineHeight.normal', value: '1.5', description: 'Body text (standard)' },
      { name: 'font.lineHeight.relaxed', value: '1.625', description: 'Long-form reading content' },
      { name: 'font.lineHeight.loose', value: '2', description: 'Spacious text, large captions' },
      // Letter spacing
      { name: 'font.letterSpacing.tighter', value: '-0.05em', description: 'Display headings (large text)' },
      { name: 'font.letterSpacing.tight', value: '-0.025em', description: 'Headings' },
      { name: 'font.letterSpacing.normal', value: '0em', description: 'Body text' },
      { name: 'font.letterSpacing.wide', value: '0.025em', description: 'Buttons, labels' },
      { name: 'font.letterSpacing.wider', value: '0.05em', description: 'All-caps labels, overlines' },
      { name: 'font.letterSpacing.widest', value: '0.1em', description: 'Small-caps, badge text' },
    ],
  },
  spacing: {
    name: 'Spacing',
    description: 'Spatial scale based on a 4px (0.25rem) base unit. Used consistently for padding, margin, and gap properties across all components.',
    tokens: [
      { name: 'space.0', value: '0', description: 'No spacing' },
      { name: 'space.0.5', value: '0.125rem', description: '2px - Minimal spacing, icon adjustments' },
      { name: 'space.1', value: '0.25rem', description: '4px - Tight spacing, inline elements' },
      { name: 'space.1.5', value: '0.375rem', description: '6px - Small gaps' },
      { name: 'space.2', value: '0.5rem', description: '8px - Default small gap, icon-to-text spacing' },
      { name: 'space.2.5', value: '0.625rem', description: '10px - Button vertical padding (small)' },
      { name: 'space.3', value: '0.75rem', description: '12px - Button vertical padding (medium), form field gaps' },
      { name: 'space.4', value: '1rem', description: '16px - Card padding, section padding (mobile), standard gap' },
      { name: 'space.5', value: '1.25rem', description: '20px - Comfortable padding' },
      { name: 'space.6', value: '1.5rem', description: '24px - Card padding (spacious), section padding (tablet)' },
      { name: 'space.8', value: '2rem', description: '32px - Section spacing, major gaps' },
      { name: 'space.10', value: '2.5rem', description: '40px - Large section spacing' },
      { name: 'space.12', value: '3rem', description: '48px - Section padding (desktop)' },
      { name: 'space.16', value: '4rem', description: '64px - Large section gaps, hero padding' },
      { name: 'space.20', value: '5rem', description: '80px - Major section dividers' },
      { name: 'space.24', value: '6rem', description: '96px - Page-level vertical rhythm' },
      { name: 'space.32', value: '8rem', description: '128px - Hero section vertical padding' },
    ],
  },
  sizing: {
    name: 'Sizing',
    description: 'Component sizing tokens for consistent element dimensions across the design system.',
    tokens: [
      { name: 'size.icon.xs', value: '12px', description: 'Tiny icons (badge indicators)' },
      { name: 'size.icon.sm', value: '16px', description: 'Small icons (inline with text)' },
      { name: 'size.icon.md', value: '20px', description: 'Default icon size' },
      { name: 'size.icon.lg', value: '24px', description: 'Large icons (navigation, primary actions)' },
      { name: 'size.icon.xl', value: '32px', description: 'Extra large icons (feature showcases)' },
      { name: 'size.touchTarget.minimum', value: '44px', description: 'WCAG minimum touch target (44x44px)' },
      { name: 'size.input.sm', value: '32px', description: 'Small input/button height' },
      { name: 'size.input.md', value: '40px', description: 'Default input/button height' },
      { name: 'size.input.lg', value: '48px', description: 'Large input/button height' },
      { name: 'size.avatar.xs', value: '24px', description: 'Tiny avatar (inline mentions)' },
      { name: 'size.avatar.sm', value: '32px', description: 'Small avatar (lists, comments)' },
      { name: 'size.avatar.md', value: '40px', description: 'Default avatar (nav bar, cards)' },
      { name: 'size.avatar.lg', value: '48px', description: 'Large avatar (profile header)' },
      { name: 'size.avatar.xl', value: '64px', description: 'Extra large avatar (profile page)' },
      { name: 'size.container.sm', value: '640px', description: 'Small container max-width (prose)' },
      { name: 'size.container.md', value: '768px', description: 'Medium container max-width' },
      { name: 'size.container.lg', value: '1024px', description: 'Large container max-width' },
      { name: 'size.container.xl', value: '1280px', description: 'Standard page container max-width' },
      { name: 'size.container.2xl', value: '1440px', description: 'Wide container max-width' },
    ],
  },
  border: {
    name: 'Border',
    description: 'Border width and radius tokens for consistent edge treatments.',
    tokens: [
      // Border width
      { name: 'border.width.none', value: '0', description: 'No border' },
      { name: 'border.width.thin', value: '1px', description: 'Default border width (inputs, cards, dividers)' },
      { name: 'border.width.medium', value: '2px', description: 'Focus rings, emphasis borders' },
      { name: 'border.width.thick', value: '4px', description: 'Strong emphasis, active tab indicators' },
      // Border radius
      { name: 'border.radius.none', value: '0', description: 'No rounding (sharp corners)' },
      { name: 'border.radius.sm', value: '0.125rem', description: '2px - Subtle rounding' },
      { name: 'border.radius.md', value: '0.375rem', description: '6px - Default component rounding (buttons, inputs, cards)' },
      { name: 'border.radius.lg', value: '0.5rem', description: '8px - Prominent rounding (larger cards, modals)' },
      { name: 'border.radius.xl', value: '0.75rem', description: '12px - Large rounding (feature cards)' },
      { name: 'border.radius.2xl', value: '1rem', description: '16px - Very large rounding' },
      { name: 'border.radius.full', value: '9999px', description: 'Pill shape (badges, fully rounded buttons, avatars)' },
    ],
  },
  shadow: {
    name: 'Shadow',
    description: 'Elevation shadow tokens representing visual depth. Higher elevation values indicate elements closer to the viewer.',
    tokens: [
      { name: 'shadow.none', value: 'none', description: 'No shadow (flat/flush elements)' },
      { name: 'shadow.xs', value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', description: 'Minimal elevation (subtle cards)' },
      { name: 'shadow.sm', value: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)', description: 'Low elevation (cards, buttons)' },
      { name: 'shadow.md', value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', description: 'Medium elevation (dropdowns, popovers)' },
      { name: 'shadow.lg', value: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)', description: 'High elevation (modals, drawers)' },
      { name: 'shadow.xl', value: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', description: 'Very high elevation (notifications, floating elements)' },
      { name: 'shadow.2xl', value: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', description: 'Maximum elevation (prominent modals, landing page elements)' },
      { name: 'shadow.inner', value: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)', description: 'Inset shadow (pressed states, input fields)' },
    ],
  },
  opacity: {
    name: 'Opacity',
    description: 'Opacity tokens for consistent transparency levels across overlays, disabled states, and decorative elements.',
    tokens: [
      { name: 'opacity.0', value: '0', description: 'Fully transparent (hidden)' },
      { name: 'opacity.5', value: '0.05', description: 'Very subtle (hover backgrounds, zebra striping)' },
      { name: 'opacity.10', value: '0.10', description: 'Subtle backgrounds' },
      { name: 'opacity.20', value: '0.20', description: 'Light backgrounds, skeleton shimmer' },
      { name: 'opacity.30', value: '0.30', description: 'Moderate transparency' },
      { name: 'opacity.40', value: '0.40', description: 'Disabled state opacity (common choice)' },
      { name: 'opacity.50', value: '0.50', description: 'Half opacity, modal backdrop (alternative)' },
      { name: 'opacity.60', value: '0.60', description: 'Modal backdrop overlay (standard)' },
      { name: 'opacity.70', value: '0.70', description: 'Strong overlay' },
      { name: 'opacity.80', value: '0.80', description: 'Near-opaque overlay' },
      { name: 'opacity.90', value: '0.90', description: 'Almost fully opaque' },
      { name: 'opacity.100', value: '1', description: 'Fully opaque (default)' },
    ],
  },
  zIndex: {
    name: 'Z-Index',
    description: 'Layering tokens for consistent stacking order. Organized into named layers to prevent z-index wars.',
    tokens: [
      { name: 'zIndex.hide', value: '-1', description: 'Hidden behind everything' },
      { name: 'zIndex.base', value: '0', description: 'Default layer (page content)' },
      { name: 'zIndex.docked', value: '10', description: 'Sticky elements within page flow' },
      { name: 'zIndex.dropdown', value: '1000', description: 'Dropdown menus and popovers' },
      { name: 'zIndex.sticky', value: '1100', description: 'Sticky headers and footers' },
      { name: 'zIndex.banner', value: '1200', description: 'Banner notifications and alerts' },
      { name: 'zIndex.overlay', value: '1300', description: 'Backdrop overlays for modals/drawers' },
      { name: 'zIndex.modal', value: '1400', description: 'Modal dialogs and drawers' },
      { name: 'zIndex.popover', value: '1500', description: 'Popovers above modals (rare)' },
      { name: 'zIndex.toast', value: '1600', description: 'Toast notifications (highest visible layer)' },
      { name: 'zIndex.tooltip', value: '1700', description: 'Tooltips (above everything)' },
    ],
  },
  motion: {
    name: 'Motion',
    description: 'Animation and transition tokens for consistent micro-interactions. Includes durations, easing curves, and prefers-reduced-motion considerations.',
    tokens: [
      // Duration
      { name: 'motion.duration.instant', value: '0ms', description: 'No animation (immediate state change)' },
      { name: 'motion.duration.fastest', value: '75ms', description: 'Micro-interactions (active/pressed state)' },
      { name: 'motion.duration.fast', value: '150ms', description: 'Quick transitions (hover states, tooltip show)' },
      { name: 'motion.duration.normal', value: '200ms', description: 'Standard transitions (dropdown open, color changes)' },
      { name: 'motion.duration.moderate', value: '300ms', description: 'Medium transitions (panel slide, accordion expand)' },
      { name: 'motion.duration.slow', value: '500ms', description: 'Deliberate transitions (modal open, page transitions)' },
      { name: 'motion.duration.slower', value: '700ms', description: 'Slow transitions (complex animations, multi-element orchestration)' },
      { name: 'motion.duration.slowest', value: '1000ms', description: 'Long transitions (full-page animations, loading sequences)' },
      // Easing curves
      { name: 'motion.ease.linear', value: 'linear', description: 'Constant speed (progress bars, continuous animations)' },
      { name: 'motion.ease.in', value: 'cubic-bezier(0.4, 0, 1, 1)', description: 'Accelerating (elements exiting the screen)' },
      { name: 'motion.ease.out', value: 'cubic-bezier(0, 0, 0.2, 1)', description: 'Decelerating (elements entering the screen)' },
      { name: 'motion.ease.inOut', value: 'cubic-bezier(0.4, 0, 0.2, 1)', description: 'Smooth acceleration and deceleration (state changes, repositioning)' },
      { name: 'motion.ease.spring', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', description: 'Spring-like overshoot (playful UI, bouncy elements)' },
      { name: 'motion.ease.bounce', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', description: 'Bounce effect (notifications, attention-grabbing)' },
    ],
  },
  breakpoints: {
    name: 'Breakpoints',
    description: 'Responsive design breakpoints for consistent layout behavior across device sizes. Use mobile-first (min-width) media queries.',
    tokens: [
      { name: 'breakpoint.xs', value: '375px', description: 'Small mobile (iPhone SE, compact phones)' },
      { name: 'breakpoint.sm', value: '640px', description: 'Large mobile / small tablet' },
      { name: 'breakpoint.md', value: '768px', description: 'Tablet portrait' },
      { name: 'breakpoint.lg', value: '1024px', description: 'Tablet landscape / small desktop' },
      { name: 'breakpoint.xl', value: '1280px', description: 'Desktop (standard)' },
      { name: 'breakpoint.2xl', value: '1440px', description: 'Large desktop (wide screens)' },
      { name: 'breakpoint.3xl', value: '1920px', description: 'Extra-large desktop (full HD monitors)' },
    ],
  },
};

// =============================================================================
// 6. SOURCE AUTHORITY HIERARCHY
// =============================================================================
// Five-tier trust hierarchy for evaluating design guidance sources.
// Based on the principle that closer to the specification = more trustworthy.
// =============================================================================

export const SOURCE_AUTHORITY: SourceAuthority[] = [
  {
    tier: 'gold_standard',
    level: 1,
    label: 'Gold Standard Specifications',
    description: 'Official W3C specifications and HTML/CSS/ARIA standards. These are the authoritative sources of truth for web accessibility and semantics. Always follow these; deviations require explicit justification.',
    sources: [
      'W3C WCAG 2.1/2.2 Specification',
      'W3C HTML Living Standard (WHATWG)',
      'W3C CSS Specifications',
      'W3C WAI-ARIA 1.2 Specification',
      'W3C Design Tokens Community Group Format',
    ],
    trustNotes: 'Follow without exception. If a design decision conflicts with a gold standard source, the specification takes precedence.',
  },
  {
    tier: 'authoritative',
    level: 2,
    label: 'Authoritative Guidance',
    description: 'Well-researched, widely adopted resources created by accessibility and UX experts with deep domain knowledge. These sources interpret the specifications and provide practical, tested guidance.',
    sources: [
      'Inclusive Components by Heydon Pickering',
      'GOV.UK Design System and Service Manual',
      'Deque University and axe-core documentation',
      'A11Y Project resources and checklists',
      'WebAIM articles and evaluation tools',
      'Nielsen Norman Group research articles',
      'Baymard Institute UX research',
    ],
    trustNotes: 'Highly reliable. Follow their guidance unless it conflicts with gold standard specifications. Cross-reference when guidance seems unusual.',
  },
  {
    tier: 'reference',
    level: 3,
    label: 'Reference Implementations',
    description: 'Official design pattern guides that provide reference implementations. These are well-intentioned but may contain errors, inconsistencies, or opinions. Useful as starting points but verify against specifications.',
    sources: [
      'WAI-ARIA Authoring Practices Guide (APG)',
      'MDN Web Docs (Mozilla Developer Network)',
      'web.dev (Google) accessibility and UX guides',
      'A11y-101 and accessibility blog resources',
    ],
    trustNotes: 'Good reference but verify against gold standard. The ARIA APG in particular has known issues where some patterns are more complex than necessary. Cross-check with authoritative sources.',
  },
  {
    tier: 'example',
    level: 4,
    label: 'Design System Examples',
    description: 'Production design systems from major companies. These represent real-world implementations backed by significant user research, but they are optimized for their specific products and contexts. Adapt rather than copy directly.',
    sources: [
      'Material Design (Google)',
      'Carbon Design System (IBM)',
      'Primer Design System (GitHub)',
      'Fluent Design System (Microsoft)',
      'Polaris Design System (Shopify)',
      'Chakra UI, Radix UI, shadcn/ui component libraries',
      'Lightning Design System (Salesforce)',
      'Atlassian Design System',
    ],
    trustNotes: 'Excellent for implementation patterns and visual reference, but remember each system is designed for its own context. Evaluate whether a pattern applies to your use case before adopting it.',
  },
  {
    tier: 'community',
    level: 5,
    label: 'Community Knowledge',
    description: 'Blog posts, tutorials, conference talks, and community-contributed resources. Quality varies widely. These can provide creative ideas and real-world perspectives but should always be validated against higher-tier sources.',
    sources: [
      'CSS-Tricks, Smashing Magazine, A List Apart articles',
      'Dev.to and Medium UX/accessibility blog posts',
      'Conference talk recordings (An Event Apart, Clarity, axe-con)',
      'Dribbble, Behance (for visual inspiration only, not accessibility patterns)',
      'Stack Overflow answers (for implementation details)',
      'YouTube tutorials and courses',
    ],
    trustNotes: 'Treat as inspiration and supplementary information. Always verify accessibility claims against authoritative or gold standard sources. Visual trends from Dribbble/Behance should be evaluated for accessibility before adoption.',
  },
];

// =============================================================================
// 7. DESIGN QUALITY CHECKLIST
// =============================================================================
// Pre-delivery checklist items for ensuring design quality before shipping.
// Each check includes rationale, severity level, and whether it can be automated.
// =============================================================================

export const DESIGN_QUALITY_CHECKLIST: QualityCheck[] = [
  // --- Visual Consistency ---
  {
    id: 'vc-01',
    category: 'Visual Consistency',
    check: 'All icons use SVG format, not emoji characters or icon fonts',
    rationale: 'SVGs scale without quality loss, are accessible, stylable, and perform better than icon fonts. Emoji rendering varies across platforms and cannot be styled consistently.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'vc-02',
    category: 'Visual Consistency',
    check: 'All clickable elements have cursor: pointer applied',
    rationale: 'The pointer cursor is a universal affordance indicating an element is interactive. Missing it makes buttons and links feel broken or non-interactive.',
    severity: 'minor',
    automated: true,
  },
  {
    id: 'vc-03',
    category: 'Visual Consistency',
    check: 'Hover state transitions use 150-300ms duration with ease-out easing',
    rationale: 'Transitions faster than 150ms feel jarring; slower than 300ms feel sluggish. Ease-out feels natural as the transition decelerates into the final state.',
    severity: 'minor',
    automated: true,
  },
  {
    id: 'vc-04',
    category: 'Visual Consistency',
    check: 'All colors in use exist in the defined design token palette',
    rationale: 'Rogue hex values outside the token system create inconsistency, make theming impossible, and indicate design system violations.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'vc-05',
    category: 'Visual Consistency',
    check: 'Typography uses only defined type scale steps (no arbitrary font sizes)',
    rationale: 'Arbitrary font sizes break visual rhythm, make the design harder to maintain, and indicate missing design system adherence.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'vc-06',
    category: 'Visual Consistency',
    check: 'Spacing between elements uses the spacing scale consistently (multiples of 4px or 8px)',
    rationale: 'Consistent spacing creates visual harmony and alignment. Arbitrary values (e.g., 13px, 37px) indicate ad-hoc styling.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'vc-07',
    category: 'Visual Consistency',
    check: 'All similar components use identical styling across pages (no one-off variations)',
    rationale: 'Inconsistent component styling confuses users and increases cognitive load. Components should derive from a single source of truth.',
    severity: 'major',
    automated: false,
  },
  // --- Accessibility ---
  {
    id: 'a11y-01',
    category: 'Accessibility',
    check: 'All text meets 4.5:1 contrast ratio against its background (3:1 for large text)',
    rationale: 'WCAG 2.1 AA requirement. Insufficient contrast makes text unreadable for users with low vision or color deficiencies.',
    severity: 'critical',
    automated: true,
  },
  {
    id: 'a11y-02',
    category: 'Accessibility',
    check: 'All interactive elements have visible focus indicators that meet 3:1 contrast',
    rationale: 'WCAG 2.4.7 requirement. Keyboard users cannot navigate the interface if they cannot see where focus is.',
    severity: 'critical',
    automated: true,
  },
  {
    id: 'a11y-03',
    category: 'Accessibility',
    check: 'All images have descriptive alt text (or alt="" for decorative images)',
    rationale: 'WCAG 1.1.1 requirement. Screen reader users need text alternatives to understand image content.',
    severity: 'critical',
    automated: true,
  },
  {
    id: 'a11y-04',
    category: 'Accessibility',
    check: 'All form inputs have associated visible labels (not just placeholder text)',
    rationale: 'WCAG 3.3.2 requirement. Placeholder text disappears on input, leaving users without context for what to enter.',
    severity: 'critical',
    automated: true,
  },
  {
    id: 'a11y-05',
    category: 'Accessibility',
    check: 'Page has correct heading hierarchy (single h1, no skipped levels)',
    rationale: 'WCAG 1.3.1 requirement. Screen reader users navigate by headings. Skipped levels create confusing document structure.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'a11y-06',
    category: 'Accessibility',
    check: 'Color is not the sole means of conveying information',
    rationale: 'WCAG 1.4.1 requirement. Colorblind users cannot distinguish information conveyed only by color.',
    severity: 'critical',
    automated: false,
  },
  {
    id: 'a11y-07',
    category: 'Accessibility',
    check: 'All touch targets are at least 44x44px on mobile',
    rationale: 'WCAG 2.5.5 guideline. Small touch targets cause misclicks and frustrate users with motor impairments.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'a11y-08',
    category: 'Accessibility',
    check: 'Page has a "Skip to main content" link as the first focusable element',
    rationale: 'WCAG 2.4.1 requirement. Allows keyboard users to bypass repeated navigation blocks.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'a11y-09',
    category: 'Accessibility',
    check: 'All animations respect prefers-reduced-motion media query',
    rationale: 'WCAG 2.3.3 guideline. Users with vestibular disorders can experience nausea or vertigo from animations.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'a11y-10',
    category: 'Accessibility',
    check: 'All ARIA roles and properties are correctly applied to custom components',
    rationale: 'WCAG 4.1.2 requirement. Incorrect ARIA is worse than no ARIA; it misleads assistive technologies.',
    severity: 'critical',
    automated: true,
  },
  // --- Responsive Design ---
  {
    id: 'rwd-01',
    category: 'Responsive Design',
    check: 'Layout tested at breakpoints: 375px, 768px, 1024px, 1440px',
    rationale: 'These breakpoints cover the most common device widths: mobile, tablet, small desktop, and standard desktop.',
    severity: 'critical',
    automated: false,
  },
  {
    id: 'rwd-02',
    category: 'Responsive Design',
    check: 'No horizontal scrollbar appears at any breakpoint (except for data tables)',
    rationale: 'WCAG 1.4.10 Reflow requirement. Horizontal scrolling is unexpected and makes content inaccessible on mobile.',
    severity: 'critical',
    automated: true,
  },
  {
    id: 'rwd-03',
    category: 'Responsive Design',
    check: 'Text remains readable without zooming on mobile (minimum 16px body text)',
    rationale: 'Body text below 16px requires zooming on mobile devices, degrading the experience.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'rwd-04',
    category: 'Responsive Design',
    check: 'Images and media use responsive sizing (max-width: 100%, srcset for resolution)',
    rationale: 'Fixed-width images overflow containers on small screens. srcset delivers appropriately sized images.',
    severity: 'major',
    automated: true,
  },
  // --- Interaction Quality ---
  {
    id: 'iq-01',
    category: 'Interaction Quality',
    check: 'All interactive states are defined: default, hover, active, focus, disabled, loading',
    rationale: 'Missing states make the interface feel incomplete. Users rely on state changes to understand interactivity.',
    severity: 'major',
    automated: false,
  },
  {
    id: 'iq-02',
    category: 'Interaction Quality',
    check: 'Error states have clear messaging with specific descriptions and recovery suggestions',
    rationale: 'Nielsen Heuristic #9. Generic errors frustrate users and prevent recovery.',
    severity: 'major',
    automated: false,
  },
  {
    id: 'iq-03',
    category: 'Interaction Quality',
    check: 'Empty states provide guidance and a primary action (not blank screens)',
    rationale: 'Empty screens leave users stranded. Good empty states guide users toward their first action.',
    severity: 'major',
    automated: false,
  },
  {
    id: 'iq-04',
    category: 'Interaction Quality',
    check: 'Loading states use skeleton loaders or meaningful indicators (not just a spinner)',
    rationale: 'Skeleton loaders maintain layout stability and reduce perceived loading time by previewing the content structure.',
    severity: 'minor',
    automated: false,
  },
  // --- Performance ---
  {
    id: 'perf-01',
    category: 'Performance',
    check: 'Largest Contentful Paint (LCP) is under 2.5 seconds',
    rationale: 'Core Web Vital. LCP above 2.5s is classified as "needs improvement" and hurts user experience and SEO.',
    severity: 'critical',
    automated: true,
  },
  {
    id: 'perf-02',
    category: 'Performance',
    check: 'Cumulative Layout Shift (CLS) is under 0.1',
    rationale: 'Core Web Vital. High CLS causes content to jump unexpectedly, leading to misclicks and user frustration.',
    severity: 'critical',
    automated: true,
  },
  {
    id: 'perf-03',
    category: 'Performance',
    check: 'Interaction to Next Paint (INP) is under 200ms',
    rationale: 'Core Web Vital. Slow response to user interactions makes the page feel unresponsive.',
    severity: 'critical',
    automated: true,
  },
  {
    id: 'perf-04',
    category: 'Performance',
    check: 'Images use modern formats (WebP or AVIF) with fallbacks',
    rationale: 'WebP and AVIF provide 25-50% size reduction over JPEG/PNG with equivalent quality.',
    severity: 'major',
    automated: true,
  },
  {
    id: 'perf-05',
    category: 'Performance',
    check: 'Web fonts are subset, preloaded, and use font-display: swap',
    rationale: 'Unoptimized fonts cause invisible text (FOIT) or layout shifts (FOUT). Subsetting reduces file size dramatically.',
    severity: 'major',
    automated: true,
  },
  // --- Content & Copy ---
  {
    id: 'copy-01',
    category: 'Content & Copy',
    check: 'CTA buttons use specific action verbs ("Add to cart", "Start free trial", "Download report")',
    rationale: 'Specific action verbs set clear expectations. Generic labels like "Submit" or "Click here" reduce conversion.',
    severity: 'major',
    automated: false,
  },
  {
    id: 'copy-02',
    category: 'Content & Copy',
    check: 'Error messages are written in plain language and include corrective instructions',
    rationale: 'Nielsen Heuristic #9. Technical error codes frustrate users. Messages should explain the problem and how to fix it.',
    severity: 'major',
    automated: false,
  },
  {
    id: 'copy-03',
    category: 'Content & Copy',
    check: 'Microcopy is consistent in tone, terminology, and formatting across the entire application',
    rationale: 'Nielsen Heuristic #4. Inconsistent language causes confusion and reduces trust.',
    severity: 'minor',
    automated: false,
  },
];

// =============================================================================
// 8. INTERACTION DESIGN PRINCIPLES
// =============================================================================
// Core principles governing how users interact with interfaces.
// Each principle includes category, description, actionable guidelines,
// and specific measurements or specifications.
// =============================================================================

export const INTERACTION_PRINCIPLES: InteractionPrinciple[] = [
  {
    name: 'Micro-Interaction Timing',
    category: 'Motion',
    description: 'Every interactive element should provide immediate visual feedback through carefully timed micro-interactions. The timing of these transitions directly affects perceived responsiveness and polish.',
    guidelines: [
      'Hover state transitions should use 150-200ms duration with ease-out easing',
      'Active/pressed state should respond within 50-100ms for immediate tactile feel',
      'Color changes and opacity transitions should use 150-200ms',
      'Transform transitions (scale, translate) should use 200-300ms',
      'Disable transitions for users with prefers-reduced-motion enabled',
    ],
    specifications: {
      'hover-duration': '150-200ms',
      'active-duration': '50-100ms',
      'color-transition': '150-200ms ease-out',
      'transform-transition': '200-300ms ease-out',
      'easing-enter': 'cubic-bezier(0, 0, 0.2, 1)',
      'easing-exit': 'cubic-bezier(0.4, 0, 1, 1)',
      'easing-standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  {
    name: 'Loading States',
    category: 'Feedback',
    description: 'Loading states should always prefer skeleton loading over spinners. Skeletons maintain layout stability, reduce perceived wait time, and provide spatial context for incoming content.',
    guidelines: [
      'For operations under 300ms: show no loading indicator (instant feel)',
      'For 300ms-1s: show a subtle inline indicator (progress bar or skeleton)',
      'For 1s-5s: show skeleton loader matching the content layout',
      'For 5s+: show progress bar with percentage and estimated time remaining',
      'Always show skeleton for a minimum of 300ms to prevent flash',
      'Transition from skeleton to content with a 200ms fade-in',
    ],
    specifications: {
      'instant-threshold': '300ms',
      'skeleton-threshold': '1000ms',
      'progress-threshold': '5000ms',
      'skeleton-min-display': '300ms',
      'skeleton-shimmer-duration': '1.5-2s',
      'content-fade-in': '200ms ease-out',
    },
  },
  {
    name: 'Page and Content Transitions',
    category: 'Motion',
    description: 'Transitions between states, pages, and content views should communicate spatial relationships, maintain context, and guide user attention. Entrance animations should be slightly longer than exit animations.',
    guidelines: [
      'Entrance animations: 200-300ms with ease-out (decelerating into position)',
      'Exit animations: 150-200ms with ease-in (accelerating out of view)',
      'State change animations: 200-300ms with ease-in-out',
      'Elements should animate from their origin (expand from trigger, slide from edge)',
      'Stagger animations for lists of items (50-100ms delay between items, max 5 items staggered)',
      'Use shared element transitions for page navigations where possible',
    ],
    specifications: {
      'entrance-duration': '200-300ms',
      'exit-duration': '150-200ms',
      'state-change-duration': '200-300ms',
      'stagger-delay': '50-100ms',
      'max-stagger-items': '5',
      'entrance-easing': 'ease-out',
      'exit-easing': 'ease-in',
    },
  },
  {
    name: 'Keyboard Navigation',
    category: 'Input',
    description: 'Complete keyboard accessibility is non-negotiable. Every interactive element must be reachable and operable via keyboard alone. Focus management is critical for single-page applications and dynamic content.',
    guidelines: [
      'All interactive elements must be reachable via Tab key in a logical order',
      'Custom widgets must implement the WAI-ARIA keyboard interaction patterns',
      'Focus must be visible with a high-contrast indicator (minimum 3:1 contrast ratio)',
      'Modal and drawer components must trap focus while open',
      'After closing a modal/drawer, focus must return to the trigger element',
      'Skip navigation link must be the first focusable element on every page',
      'Focus must be moved programmatically when content changes (route change, dynamic insertion)',
    ],
    specifications: {
      'focus-ring-width': '2px',
      'focus-ring-offset': '2px',
      'focus-ring-color': 'Brand color or high-contrast outline',
      'focus-ring-contrast': '3:1 minimum against adjacent colors',
      'tab-order': 'DOM order matching visual order',
      'skip-link': 'First focusable element, visible on focus',
    },
  },
  {
    name: 'Touch Targets',
    category: 'Input',
    description: 'All interactive elements must be large enough for accurate touch input. The minimum touch target size prevents misclicks and accommodates users with motor impairments.',
    guidelines: [
      'Minimum touch target size: 44x44px (WCAG 2.5.5)',
      'Recommended touch target size: 48x48px (Material Design guideline)',
      'Spacing between adjacent touch targets: at least 8px',
      'Touch targets can be larger than the visible element (use padding or ::after pseudo-element)',
      'Text links in body copy should have sufficient line-height (1.5+) for touch spacing',
      'Small visual elements (icons, badges) should expand their hit area with transparent padding',
    ],
    specifications: {
      'minimum-size': '44x44px',
      'recommended-size': '48x48px',
      'minimum-spacing': '8px',
      'text-link-line-height': '1.5 minimum',
    },
  },
  {
    name: 'Scroll Behavior',
    category: 'Navigation',
    description: 'Scroll behavior affects how users experience and navigate through content. Smooth scrolling, scroll restoration, and scroll-linked interactions should be handled thoughtfully.',
    guidelines: [
      'Use scroll-behavior: smooth for anchor link navigation (not for page loads)',
      'Implement scroll restoration for SPA back/forward navigation',
      'Sticky headers need scroll-padding-top equal to the header height',
      'Infinite scroll must include a "Load more" button fallback',
      'Parallax effects should be disabled for prefers-reduced-motion users',
      'Scroll-linked animations should use Intersection Observer, not scroll events',
      'Provide a "Back to top" button for pages longer than 3 viewport heights',
    ],
    specifications: {
      'smooth-scroll-duration': '300-500ms',
      'back-to-top-threshold': '3x viewport height',
      'infinite-scroll-trigger': '200px from bottom',
      'scroll-padding-top': 'Equal to sticky header height + 16px',
    },
  },
  {
    name: 'Animation Patterns',
    category: 'Motion',
    description: 'Animations should serve a functional purpose: guiding attention, showing spatial relationships, or providing continuity during state changes. Decorative animation should be minimal and respect user preferences.',
    guidelines: [
      'Entrance animations: fade in + slide up (8-16px) or scale from 95% to 100%',
      'Exit animations: fade out + slide down or scale to 95%',
      'State change: cross-fade between states (200ms)',
      'Collapse/expand: animate max-height or grid-template-rows for natural flow',
      'Loading shimmer: linear gradient sweep from left to right, 1.5-2s cycle',
      'Always wrap animations in @media (prefers-reduced-motion: no-preference) {}',
    ],
    specifications: {
      'fade-in-duration': '200ms',
      'slide-distance': '8-16px',
      'scale-start': '0.95',
      'scale-end': '1.0',
      'shimmer-duration': '1.5-2s',
      'reduced-motion-fallback': 'Instant state change with no animation',
    },
  },
  {
    name: 'Perceived Performance',
    category: 'Feedback',
    description: 'The perception of speed is as important as actual speed. Optimistic updates, skeleton loaders, and progressive rendering make interfaces feel faster than they actually are.',
    guidelines: [
      'Use optimistic UI updates: show the expected result immediately, then reconcile with the server',
      'Prefetch likely next pages on link hover (200ms delay before fetch)',
      'Use skeleton loading to show page structure before data arrives',
      'Lazy-load below-the-fold content with Intersection Observer',
      'Prioritize above-the-fold content rendering (critical CSS, LCP optimization)',
      'Show a progress bar at the top of the page during route transitions',
      'Pre-render or pre-cache frequently visited routes',
    ],
    specifications: {
      'optimistic-update': 'Show result immediately, reconcile async',
      'prefetch-delay': '200ms hover before prefetching',
      'lazy-load-margin': '200px rootMargin for Intersection Observer',
      'lcp-target': 'Under 2.5 seconds',
      'fcp-target': 'Under 1.8 seconds',
      'inp-target': 'Under 200ms',
    },
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
// Utility functions for formatting knowledge base data into prompt-ready strings.
// =============================================================================

/** Format Nielsen's heuristics for inclusion in AI prompts. */
export function formatHeuristicsForPrompt(heuristics: UsabilityHeuristic[]): string {
  return heuristics
    .map(
      (h) =>
        `**${h.id}. ${h.name}**: ${h.description}\n` +
        `  Examples: ${h.examples.slice(0, 3).join('; ')}\n` +
        `  Checkpoints: ${h.checkpoints.slice(0, 3).join('; ')}`
    )
    .join('\n\n');
}

/** Format WCAG guidelines for prompt inclusion, optionally filtered by level.
 * Accepts either a string level ('A' | 'AA') for backward compatibility
 * or an options object { level?, principle? } for fine-grained filtering.
 */
export function formatWCAGForPrompt(
  guidelines: WCAGGuideline[],
  options?: 'A' | 'AA' | { level?: 'A' | 'AA'; principle?: WCAGGuideline['principle'] }
): string {
  // Normalize backward-compatible string argument to options object
  const opts: { level?: 'A' | 'AA'; principle?: WCAGGuideline['principle'] } =
    typeof options === 'string' ? { level: options } : (options ?? {});

  let filtered = guidelines;
  if (opts.level) {
    filtered = filtered.filter((g) => {
      if (opts.level === 'AA') return true; // AA includes A and AA
      return g.level === 'A';
    });
  }
  if (opts.principle) {
    filtered = filtered.filter((g) => g.principle === opts.principle);
  }
  return filtered
    .map((g) => `- **${g.criterion} ${g.name}** (Level ${g.level}): ${g.description}`)
    .join('\n');
}

/** Format component blueprints for prompt inclusion, optionally filtered by name. */
export function formatBlueprintsForPrompt(
  blueprints: ComponentBlueprint[],
  componentNames?: string[]
): string {
  const filtered = componentNames
    ? blueprints.filter((b) => componentNames.some((name) => b.name.toLowerCase().includes(name.toLowerCase())))
    : blueprints;
  return filtered
    .map(
      (b) =>
        `**${b.name}**\n` +
        `  States: ${b.requiredStates.join(', ')}\n` +
        `  ARIA: ${b.ariaRequirements.slice(0, 3).join('; ')}\n` +
        `  Keyboard: ${b.keyboardInteraction.slice(0, 3).join('; ')}\n` +
        `  Do: ${b.dos.slice(0, 3).join('; ')}\n` +
        `  Don't: ${b.donts.slice(0, 3).join('; ')}`
    )
    .join('\n\n');
}

/** Format UI patterns for prompt inclusion, optionally filtered by category. */
export function formatPatternsForPrompt(
  patterns: UIPattern[],
  category?: UIPattern['category']
): string {
  const filtered = category ? patterns.filter((p) => p.category === category) : patterns;
  return filtered
    .map(
      (p) =>
        `**${p.name}** (${p.category}): ${p.description}\n` +
        `  When to use: ${p.whenToUse.slice(0, 2).join('; ')}\n` +
        `  When NOT to use: ${p.whenNotToUse.slice(0, 2).join('; ')}\n` +
        `  A11y: ${p.accessibilityRequirements.slice(0, 2).join('; ')}`
    )
    .join('\n\n');
}

/** Format quality checklist for prompt inclusion, optionally filtered by category. */
export function formatQualityChecklistForPrompt(
  checks: QualityCheck[],
  category?: string
): string {
  const filtered = category ? checks.filter((c) => c.category === category) : checks;
  const grouped = filtered.reduce<Record<string, QualityCheck[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(
      ([cat, items]) =>
        `### ${cat}\n${items.map((c) => `- [ ] [${c.severity.toUpperCase()}] ${c.check}`).join('\n')}`
    )
    .join('\n\n');
}

/** Format source authority hierarchy for prompt inclusion. */
export function formatSourceAuthorityForPrompt(authorities: SourceAuthority[]): string {
  return authorities
    .map(
      (a) =>
        `**Tier ${a.level}: ${a.label}** (${a.tier})\n` +
        `  ${a.description}\n` +
        `  Sources: ${a.sources.slice(0, 4).join(', ')}\n` +
        `  Trust: ${a.trustNotes}`
    )
    .join('\n\n');
}

/** Format interaction principles for prompt inclusion. */
export function formatInteractionPrinciplesForPrompt(
  principles: InteractionPrinciple[]
): string {
  return principles
    .map(
      (p) =>
        `**${p.name}** (${p.category}): ${p.description}\n` +
        p.guidelines.slice(0, 4).map((g) => `  - ${g}`).join('\n')
    )
    .join('\n\n');
}

/** Get a specific heuristic by ID. */
export function getHeuristicById(id: number): UsabilityHeuristic | undefined {
  return NIELSEN_HEURISTICS.find((h) => h.id === id);
}

/** Get patterns by category. */
export function getPatternsByCategory(category: UIPattern['category']): UIPattern[] {
  return UI_PATTERNS.filter((p) => p.category === category);
}

/** Get WCAG guidelines by principle. */
export function getWCAGByPrinciple(principle: WCAGGuideline['principle']): WCAGGuideline[] {
  return WCAG_GUIDELINES.filter((g) => g.principle === principle);
}

/** Get a component blueprint by name. */
export function getBlueprintByName(name: string): ComponentBlueprint | undefined {
  return COMPONENT_BLUEPRINTS.find(
    (b) => b.name.toLowerCase() === name.toLowerCase()
  );
}

/** Get quality checks by severity. */
export function getChecksBySeverity(severity: QualityCheck['severity']): QualityCheck[] {
  return DESIGN_QUALITY_CHECKLIST.filter((c) => c.severity === severity);
}

/** Get all critical quality checks. */
export function getCriticalChecks(): QualityCheck[] {
  return getChecksBySeverity('critical');
}

// =============================================================================
// BACKWARD-COMPATIBLE ALIASES
// =============================================================================
// These exports maintain compatibility with existing prompt templates that
// imported from the previous version of this module. New code should prefer
// the primary exports above.
// =============================================================================

/** @deprecated Use DESIGN_QUALITY_CHECKLIST instead. */
export const QUALITY_CHECKLIST = DESIGN_QUALITY_CHECKLIST;

/**
 * @deprecated Use DESIGN_TOKEN_SPEC (object) instead.
 * This array format is maintained for backward compatibility with prompt templates
 * that call `.map()` on the token specs.
 */
export const DESIGN_TOKEN_SPECS: {
  category: string;
  description: string;
  namingConvention: string;
  scalePattern: string;
  examples: string[];
}[] = (Object.values(DESIGN_TOKEN_SPEC) as DesignTokenCategory[]).map((cat: DesignTokenCategory) => ({
  category: cat.name,
  description: cat.description,
  namingConvention: cat.tokens
    .slice(0, 2)
    .map((t: { name: string; value: string; description: string }) => t.name)
    .join(', '),
  scalePattern: cat.tokens.map((t: { name: string; value: string; description: string }) => `${t.name.split('.').pop()}: ${t.value}`).slice(0, 5).join(', '),
  examples: cat.tokens.slice(0, 4).map((t: { name: string; value: string; description: string }) => `${t.name}: ${t.value}`),
}));

/** @deprecated Use formatPatternsForPrompt instead. */
export const formatUIPatternsForPrompt = formatPatternsForPrompt;
