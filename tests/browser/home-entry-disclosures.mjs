// Use the visible disclosure controls; never force visibility or bypass actions.
export async function openHomeQuestionIdeas(page) {
  const summary = page.getByText('More question ideas', {exact: true});
  await summary.waitFor();
  if (!await summary.evaluate(node => node.parentElement.open)) await summary.click();
  await page.getByRole('region', {name: 'Suggested questions', exact: true}).waitFor();
}

export async function openHomeWorkforceSummary(page) {
  const summary = page.getByText('Workforce snapshot & demand summary', {exact: true});
  await summary.waitFor();
  if (!await summary.evaluate(node => node.parentElement.open)) await summary.click();
  await page.getByRole('region', {name: 'Workforce planning overview', exact: true}).waitFor();
}
