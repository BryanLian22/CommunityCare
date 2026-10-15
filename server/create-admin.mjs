import {randomUUID} from 'node:crypto';
import {db} from './db.mjs';
import {hashPassword,passwordValid} from './security.mjs';
import {ask,closePrompt} from './prompt.mjs';
try{
 const name=(await ask('Admin name: ')).trim();
 const email=(await ask('Admin email: ')).trim().toLowerCase();
 const password=await ask('Password (12–128 characters, hidden): ',true);
 const confirmation=await ask('Confirm password: ',true);
 if(password!==confirmation)throw new Error('Passwords do not match.');
 if(!name||name.length>80||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!passwordValid(password))throw new Error('Invalid name, email or password.');
 if(db.prepare('SELECT id FROM users WHERE email=?').get(email))throw new Error('Email already exists. Use a separate admin email.');
 db.prepare("INSERT INTO users(id,name,email,password_hash,role,created) VALUES(?,?,?,?,'admin',?)").run(randomUUID(),name,email,await hashPassword(password),new Date().toISOString());
 console.log('Admin created. Sign in with this email and password.');
}catch(e){console.error(e.message);process.exitCode=1}finally{closePrompt();db.close()}
