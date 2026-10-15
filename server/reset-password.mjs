import {db} from './db.mjs';
import {hashPassword,passwordValid} from './security.mjs';
import {ask,closePrompt} from './prompt.mjs';
try{
 const email=(await ask('Account email to reset: ')).trim().toLowerCase();
 const u=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(!u)throw new Error('Account not found.');
 const password=await ask('New password (12–128 characters, hidden): ',true);
 if(!passwordValid(password))throw new Error('Password must contain 12–128 characters.');
 if(password!==await ask('Confirm new password: ',true))throw new Error('Passwords do not match.');
 db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(await hashPassword(password),u.id);
 db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
 console.log('Password reset. All previous sessions were signed out.');
}catch(e){console.error(e.message);process.exitCode=1}finally{closePrompt();db.close()}
