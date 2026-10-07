// Existing workflow regressions dismiss the first-visit dialog through its real
// control. Dedicated onboarding tests cover eligibility, focus and persistence.
export async function dismissHomeOnboarding(page){
 await page.waitForFunction(()=>{const trigger=document.querySelector('[aria-controls="home-starting-instructions"]');return trigger&&!trigger.disabled});
 const dialog=page.getByRole('dialog',{name:'Home instructions',exact:true});
 if(await dialog.isVisible())await dialog.getByRole('button',{name:'Close instructions',exact:true}).click();
}
