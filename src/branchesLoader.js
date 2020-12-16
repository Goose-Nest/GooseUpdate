import { readFileSync } from 'fs';

import glob from 'glob';

export let branches = {};
global.branches = branches;

export const init =  () => {
  const dirs = glob.sync('../branches/*');

  console.log('Loading branches...');

  for (let d of dirs) {
    const name = d.split('/').pop();
  
    //const filePaths = glob.sync(`${d}/**/*`).filter((x) => x.match(/.*\..*$/));
    /*
    console.log(name, filePaths);

    let files = [];

    for (let f of filePaths) {
      files.push({
        path: f,
        content: fs.readFileSync(f)
      });
    }*/

    let files = glob.sync(`${d}/*`);

    let patch = '';
    for (let f of files) {
      const filename = f.split('/').pop();

      if (filename === 'patch.js') {
        patch = readFileSync(f, 'utf8');
        files.splice(files.indexOf(f), 1);
      }
    }

    branches[name] = {
      files,
      patch,
      meta: JSON.parse(patch.match(/\/\*META((.|\n)*?)\*\//)[1])
    };

    console.log(d, name, files, branches[name].meta);
  }

  console.log('\nCreating mixed branches...');

  const branchNames = Object.keys(branches);

  let combinations = [[]];
	for (const value of branchNames) {
		const copy = [...combinations];
		for (const prefix of copy) {
			combinations.push(prefix.concat(value));
		}
  }
  
  combinations = combinations.filter((x) => x.length > 1);

  for (const original of combinations) {
    const reverse = original.slice().reverse();

    for (const c of [reverse, original]) {
      const key = c.join('+');

      const b = c.map((x) => branches[x]);

      const res = {
        files: b.map((x) => x.files).reduce((x, a) => a.concat(x), []),
        patch: b.map((x) => x.patch).reduce((x, a) => `${x}\n${a}`, ''),
        meta: {
          version: parseInt(b.map((x) => x.meta.version).reduce((x, a) => `${x}0${a}`))
        }
      };

      branches[key] = res;
    }
  }

  console.log(branches);
};