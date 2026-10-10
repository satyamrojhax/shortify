# Contributing to Shortify

First off, thank you for considering contributing to **Shortify**! It's people like you that make Shortify a great tool for the open-source community.

We welcome all kinds of contributions: bug fixes, new features, documentation updates, and UI improvements.

## 🔗 Important Links
* **Live Website:** [https://shortify.cc.cd](https://shortify.cc.cd)
* **GitHub Repository:** [https://github.com/satyamrojhax/shortify](https://github.com/satyamrojhax/shortify)
* **NPM Package:** [https://www.npmjs.com/package/@satyamrojha/shortify](https://www.npmjs.com/package/@satyamrojha/shortify)

---

## 🚀 How to Contribute

### 1. Fork the Repository
Click the **Fork** button at the top right of the [Shortify GitHub page](https://github.com/satyamrojhax/shortify) to create your own copy of the repository.

### 2. Clone Your Fork
Clone the repository to your local machine:
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/shortify.git
cd shortify
```
*(Make sure to replace `YOUR_GITHUB_USERNAME` with your actual GitHub username!)*

### 3. Install Dependencies
Make sure you have Node.js installed, then run:
```bash
npm install
```

### 4. Create a Branch
Create a new branch for your feature or bug fix:
```bash
git checkout -b feature/your-amazing-feature
# or
git checkout -b fix/issue-number-description
```

### 5. Make Your Changes
- Write clean, maintainable code.
- Follow the existing folder structure and naming conventions.
- If you are adding a new UI component, try to use the existing `shadcn/ui` and Radix primitives in `src/components/ui`.
- Use TypeScript strictly (avoid `any` where possible).

### 6. Format and Lint
Before committing your code, ensure it adheres to our formatting and linting rules:
```bash
npm run format
npm run lint
```
Fix any errors that arise during linting.

### 7. Commit Your Changes
Write clear and descriptive commit messages.
```bash
git commit -m "feat: add user profile picture upload"
```

### 8. Push and Open a Pull Request
Push the changes to your fork:
```bash
git push origin feature/your-amazing-feature
```
Go to the [original Shortify repository](https://github.com/satyamrojhax/shortify) and click **New Pull Request**. Describe your changes in detail so we can review them efficiently.

---

## 🐛 Found a Bug?
If you find a bug in the source code, you can help us by submitting an issue to our [GitHub Repository](https://github.com/satyamrojhax/shortify/issues). Even better, you can submit a Pull Request with a fix.

## 💡 Feature Requests
You can request a new feature by submitting an issue to our [GitHub Repository](https://github.com/satyamrojhax/shortify/issues). If you would like to implement a new feature, please submit an issue with a proposal for your work first, to be sure that we can use it.

## 🔒 Security Vulnerabilities
If you discover a security vulnerability within Shortify, please DO NOT open a public issue. Instead, refer to our [SECURITY.md](SECURITY.md) for instructions on how to privately disclose the issue.

## 📜 Code of Conduct
By participating in this project, you agree to abide by our Code of Conduct. Please be respectful, welcoming, and collaborative. Toxic behavior will not be tolerated.

---
Thank you for making Shortify better! ❤️
