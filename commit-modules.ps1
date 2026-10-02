cd node-yalc
git add .
git commit -m "fix(core): cleanup dist files and resolve ESM interop issues"
cd ..

$packages = Get-ChildItem -Path packages -Directory
foreach ($pkg in $packages) {
    git add $pkg.FullName
    git commit -m "fix($($pkg.Name)): resolve build and testing issues"
}

git add package-lock.json jest.config.js tsconfig.test.json refactor_barrel.js deploy
git commit -m "chore(root): update workspace configuration, jest setup, and deploy scripts"
