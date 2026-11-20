// Commands from docs/guides/developer-setup-guide.md §5 that arrive in a later step of docs/product/roadmap.md §8.
const [, , cmd, step] = process.argv;
console.error(`"pnpm ${cmd}" chưa có: lệnh này đến ở bậc ${step} (docs/product/roadmap.md §8).`);
process.exit(1);
