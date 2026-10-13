// Open the compact calculator's native disclosure through its keyboard path.
// A missing result has no detail disclosure and is intentionally left alone.
export async function revealMonthlyCapacityDetail(page,area=page){
 const details=area.locator('details').filter({has:page.locator('summary').filter({hasText:'Monthly detail · people and FTE'})});
 if(await details.count()&&!await details.evaluate(element=>element.open)){
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
 }
}
