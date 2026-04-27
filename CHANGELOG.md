## [Unreleased]

### Added

- Optional SMTP-based email notification support via configurable MailModule
- Test email API endpoint to validate SMTP configuration
- Environment-based configuration for SMTP settings and notification toggling
- Outbreak detection with configurable rules per analysis profile
- User notification preferences:
  - Enable/disable alerts
  - Delivery frequency (immediate, daily, weekly)
  - Per-profile alert threshold
- Notification history displayed in the dashboard notification page
- Notification preferences section added to dashboard Settings
- Shared coordinate data (hospital and postcode) used by both backend and frontend
- Session validity polling with automatic redirect to login on expiry
- Support for running MIMOSA behind a reverse proxy or at a subpath
- Ability to configure external and internal API endpoints for more flexible deployments
- Support for filtering samples by Bonsai group IDs via `--groups`
- Phylogenetic tree view with cluster and detail display modes, supporting linear/radial/unrooted layouts, cluster collapsing with sized bubbles, and metadata-based node coloring with legend
- useClustering hook to fetch cluster assignments from API
- Automation service (`mimosa-automation`) for scheduled Bonsai sample ingestion
- `--re-cluster` flag to force clustering without new samples
- Retry logic for `fetch_samples` and automation pipeline runner
- Graceful fallback to metadata-only sync when clustering fails
- Cluster naming stability across ReporTree runs via nomenclature file reconstructed from latest clustering document
- New `automation` user role for service accounts
- Server-Sent Events (SSE) endpoint (`GET /api/features/events`) that streams notifications to connected clients whenever a feature is inserted, updated, replaced, or deleted
- Frontend automatically refetches all data (features, similarity, logs, clustering) when a change event is received, without requiring a manual browser refresh
- Timeline view with epi curve, weekly/monthly/quarterly resolution, cluster summaries, and location filters
- Cluster detail panel in tree view with sample table, timeline, and Excel export


### Changed
- Outbreak detection moved from client-side to backend service
- Frontend now uses centralised apiFetch utility for authenticated API calls
- MongoDB configured as a replica set to support real-time processing
- Docker Compose updated to ensure backend waits for healthy MongoDB
- FilteringLogic and MyCountyView now support controlled analysisProfile
- Improved handling of application URLs, CORS, and authentication redirects
- Frontend routing updated to work correctly when hosted under a subpath
- Backend and scripts now better support non-local deployments
- Validate Bonsai group IDs before execution and improve error handling for missing groups
- Cluster color assignment now uses evenly-spaced stepped indexing (GCD-based) instead of hashing, improving visual distinction between clusters
- Color palette expanded and reordered for greater perceptual variety
- Renamed `MONGO_URI_DOCKER` to `MONGO_URI_INTERNAL` for clarity
- Pipeline runner now logs stage start, duration, and failure per profile
- Terminal clear in pipeline state renderer is now guarded against non-TTY environment
- load_credentials()` accepts env-based credentials when no credentials file is provided
- `--update` renamed to `--update-only`; `--skip_similarity` replaced by opt-in `--run-similarity`
- Pipeline state rendering suppressed in automation mode
- Script constants centralised in `constants.py`; ReporTree params now profile-configurable
- `prepare_supplementary_metadata.py` accepts multiple profiles and optional `--groups` filtering, with retry logic on server errors
- `useAppData` fetch logic extracted into `useCallback` to support both the initial load and SSE-triggered refetches


### Fixed
- Backend startup log now correctly displays domain and port
- `get_analyzed_sample_ids()` now queries `features` collection only
- `fetch_group` now raises on HTTP 500 in addition to 404
- Group-filtered clustering now includes previously analyzed samples, preventing existing cluster assignments from being lost when a new group is processed
- Suppressed noisy MongoClientClosedError logs and change stream output when creating users
- Samples no longer show as "unknown" cluster when all allele profiles are identical and ReporTree skips partitioning. The pipeline now synthesizes stable singleton assignments in this case.
- `--profile` argument is now case-insensitive
- Fix map container re-initialization error caused by React Strict Mode double-mounting
- MatrixPage: Fixed cluster and sample filters showing options outside the selected analysis profile


## [v0.4.0]

### Added
- Pipeline execution state tracking with per-stage status, counts, and runtime summary
- `--skip_similarity` flag to explicitly skip similarity computation and uploads
- Bulk sample editing via Excel upload, including validation and preview
- Markdown- and JSON-driven sidebar content
- Generation of ReporTree-specific metadata files containing only required columns for ReporTree execution.
- Restoration of full metadata  during feature generation.
- Structured outbreak detection and a dedicated OutbreakAlert in the side panel.
- Analysis profile column and filtering in Samples dashboard
- Missing-location status and extended status filtering in Samples dashboard
- Downloadable bulk metadata editing templates


### Changed
- Similarity execution flow consolidated under a stage-based runner to reduce unnecessary recomputation
- Similarity uploads now overwrite existing records by sample ID
- Refactored frontend filtering logic to stabilise analysis profile–based filtering
- Sidebar content management simplified and externalised
- `role` and `homeCounty `fields are now optional when creating users (role defaults to `user `if omitted)
- Improved `mimosa create-user` CLI validation and usage output
- Fix crash in table row expansion when metadata fields are missing.
- Simplified My County view initialisation and fallback rendering when no home county is set
- Improved handling of missing or invalid homeCounty in localStorage
- ReporTree now runs on restricted metadata instead of full metadata files
- Fetch all available samples dynamically from Bonsai instead of a hardcoded limit
- Refactored outbreak logic to remove HTML message generation and reworked side panel layout.

### Fixed
- Normalised hospital names in the hospital coordinates list
- Normalised file handling and encoding across upload helpers
- Inconsistent filter behaviour when switching analysis profiles
- Minor validation and UI state issues in the samples dashboard
- Fix table row editing targeting wrong sample when filtered by using sample ID instead of row index
- Normalised Cluster ID parsing from TSV input and improved defensive cluster counting.
- Fix crash in --update mode due to undefined metadata_partitions_tsv
- Prevent invalid homeCounty values from being stored by enforcing canonical validation in the backend and CLI.


## [v0.3.0]

### Added
- Expanded list of Swedish hospitals with postcodes  
- Support for *Klebsiella pneumoniae*
- Profile-aware clustering

### Changed
- Default map view set to hospital-based
- Similarity workflow and upload handling restructured to reduce unnecessary recomputation 
- Profile field normalisation and request handling cleanup
- Matrix view now dynamically selects and filters by available analysis profiles
- **Dependencies:** Bump Next.js to ^15.5.9
- Test upload script and data extended to support distance matrices 
 
### Fixed
- MultiSelect filter overflow caused by incorrect PrimeReact prop casing


## [v0.2.1]
### Added
- **Distance matrix**:
  - New Distance module enabling visualisation of Hamming distances between samples in a matrix view.

- upload and runtime 'createdAt' timestamps for test data

### Changed
- **Dependencies:** Bump Next.js from 15.3.3 to 15.5.7.

### Fixed
- removed legacy `icon.ico`.




## [v0.2.0]

### Added
- **Login and authentication flow** with token-based MIMOSA user validation across scripts and improved logging of user actions.
- **Swagger documentation**
- **Role-based access control (RBAC)**:
  - Restricted access to specific routes and features based on user roles.
- **Login module**:
  - **Dashboard**  
    - Summary view of samples, recent sample activity for user’s county  
  - **My County**  
    - Map visualisation for the user’s county  
  - **Notifications**  
    - Currently does not connect to any backend logic or notification system — intended as a scaffold for future development  
  - **Logs**  
    - Detailed view of sample logs  
  - **Samples**  
    - View for Samples with the option to edit Hospital, Date and Postcode  
    - Filterable by incomplete samples (i.e. samples missing metadata)  
  - **Settings**  
    - Page for managing user’s county and password  
  - **Admin**  
    - View for adding and managing users  

### Changed
- Migrated backend from `Express` to `NestJS`
- Migrated configuration from `config.json` to `.env`
- Updated scripts to use `.env`

### Fixed
- Replaced deprecated `xlsx` with `exceljs`
