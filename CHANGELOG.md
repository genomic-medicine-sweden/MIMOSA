## [unreleased]

### Added
- Pipeline execution state tracking with per-stage status, counts, and runtime summary
- `--skip_similarity` flag to explicitly skip similarity computation and uploads
- Bulk sample editing via Excel upload, including validation and preview
- Markdown- and JSON-driven sidebar content

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

### Fixed
- Normalised hospital names in the hospital coordinates list
- Normalised file handling and encoding across upload helpers
- Inconsistent filter behaviour when switching analysis profiles
- Minor validation and UI state issues in the samples dashboard

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
