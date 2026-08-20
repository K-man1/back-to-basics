All projects must have all source code on Github. Here are the requirements:

- **Source code**, not just a complied version
- Whatever **dependency files** are required for your project
- `.gitignore` where necessary

- Clean repo (see below)
    
    ```mermaid
    project/
    ├── src/              # Main application source code
    ├── tests/            # Automated tests
    ├── docs/             # Documentation
    ├── assets/           # Images and other static resources
    ├── config/           # Configuration files
    ├── scripts/          # Development/utility scripts
    ├── README.md
    └── package.json      # Project/dependency configuration
    ```
    
    This is an example of a clean repo. Everything is in their respective folder, not scattered in root.
    
    - Organize by **purpose**, **not file type**.
    - Keep **related code together**, even in `src/`.
    - Build output, caches and other **generated files shouldn’t clutter** the source directories.
    - Keep the root clean with **project-wide config** and documentation.