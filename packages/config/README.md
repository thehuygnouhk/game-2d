# @htk/config

Cấu hình dùng chung cho mọi gói. Bản gốc nằm ở thư mục gốc repo để công cụ tự tìm thấy:

| File                 | Dùng cho                                               |
| -------------------- | ------------------------------------------------------ |
| `tsconfig.base.json` | TypeScript strict, ES2022, `moduleResolution: Bundler` |
| `eslint.config.js`   | ESLint flat config + typescript-eslint                 |
| `.prettierrc.json`   | Định dạng mã (120 cột)                                 |
| `.editorconfig`      | UTF-8, LF, 2 dấu cách                                  |
