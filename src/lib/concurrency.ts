/** items를 최대 limit개씩 동시에 처리한다(무료 API 한도 보호, PROMPT.md 8절). */
export async function runWithConcurrencyLimit<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;

  async function next(): Promise<void> {
    const index = cursor++;
    if (index >= items.length) return;
    await worker(items[index]);
    await next();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
}
