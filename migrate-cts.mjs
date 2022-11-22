import fs from "fs";
import dotenv from "dotenv";
import fetch from "node-fetch";
import _ from 'lodash';

dotenv.config();
import migrate from "slice-machine-ui/build/lib/migrate.js";

const auth = process.env.TOKEN;
const HEADERS = {
  repository: process.env.REPO,
  Authorization: `Bearer ${auth}`,
};

const handleSlicezone = (sz, ct) => {
  var duplicates = [];

  return {
    ...sz,
    config: {
      ...sz.config,
      choices: Object.fromEntries(
        Object.entries(sz.config.choices).map(([key, val]) => {
          // If slice folder doesn't exist create it
          if (!fs.existsSync(`./slices/${key}`)) {
            fs.mkdirSync(`./slices/${key}`);
            fs.writeFileSync(
              `./slices/${key}/model.json`,
              JSON.stringify(
                {
                  ...migrate.default(
                    val,
                    { sliceName: key, from: "slices" },
                    { cwd: "./" }
                  ).model,
                  migrated: undefined,
                },
                null,
                2
              )
            );

            // Create slice index.js, need to write the teplate file as well or is it in slicemachine ui ?
            // fs.writeFileSync(
            //   `./slices/${key}/index.js`,
            // );
            return [key, { type: "SharedSlice" }];
          } else {
            // Compare the slice model.json, if it has the same structure -> ignore
            // If not, then generate another slice
            // console.log(
            //   `Slice ${key} already exist in type ${ct.label}, ID: ${ct.id}! \nAction you can take: `,
            //   `\n - To merge it with ${key}, delete /slices/${key}_type_${ct.id}`,
            //   `\n - To make a variation of ${key}_type_${ct.id} in /slices/${key}, follow the Migration guide before deleting /slices/${key}_type_${ct.label}`,
            //   `\n - To make ${key}_type_${ct.id} a separate slice, rename ${key} id and label in the model.json \n`,
            // );
            fs.mkdirSync(`./slices/${key}_type_${ct.id}`);
            fs.writeFileSync(
              `./slices/${key}_type_${ct.id}/model.json`,
              JSON.stringify(
                {
                  ...migrate.default(
                    val,
                    { sliceName: key, from: "slices" },
                    { cwd: "./" }
                  ).model,
                  migrated: undefined,
                },
                null,
                2
              )
            );
            
            let duplicate = JSON.parse(fs.readFileSync(`./slices/${key}_type_${ct.id}/model.json`))
            let original = JSON.parse(fs.readFileSync(`./slices/${key}/model.json`))
            
            // console.log("SAME ?", _.isEqual(duplicate.id, original.id) && _.isEqual(duplicate.name, original.name) && _.isEqual(duplicate.variations[0].primary, original.variations[0].primary) && _.isEqual(duplicate.variations[0].items, original.variations[0].items))
            if (_.isEqual(duplicate.id, original.id) && _.isEqual(duplicate.name, original.name) && _.isEqual(duplicate.variations[0].primary, original.variations[0].primary) && _.isEqual(duplicate.variations[0].items, original.variations[0].items)) {
              console.log("THEYRE THE SAME")
            } else {
              console.log(`CREATE NEW SLICE CALLED ${key}_type_${ct.id}`)
              return [`${key}_type_${ct.id}`, { type: "SharedSlice" }];
            }
          }
          
        })
      ),
    },
  };
};

(() => {
  fetch("https://customtypes.prismic.io/customtypes", {
    headers: HEADERS,
  })
    .then((res) => res.json())
    .then((cts) => {
      let str = JSON.stringify(cts);
      str = str.replaceAll('"body":', '"slices":');
      cts = JSON.parse(str);
      // fs.mkdirSync('./customtypes')
      fs.mkdirSync("./slices");

      cts.forEach((ct) => {
        const newCt = {
          ...ct,
          json: (() => {
            return Object.fromEntries(
              Object.entries(ct.json).map(([tabKey, tab]) => {
                return [
                  tabKey,
                  Object.fromEntries(
                    Object.entries(tab).map(([fieldKey, field]) => {
                      if (field.type === "Slices") {
                        return [fieldKey, handleSlicezone(field, ct)];
                      }
                      return [fieldKey, field];
                    })
                  ),
                ];
              })
            );
          })(),
        };

        // fs.mkdirSync(`./customtypes/${newCt.id}`)
        // fs.writeFileSync(`./customtypes/${newCt.id}/index.json`, JSON.stringify(newCt, null, 2))

        // const tabs = Object.entries(ct.json)
        // const newTabs = tabs.map(t => {
        //   const [tabKey, tab] = t
        //   const entries = Object.entries(tab)
        //   // console.log({ entries, tab })

        //   const newTabEntries = entries.map((entry) => {
        //     const [key, val] = entry
        //     if (val.type === 'Slices') {
        //       // console.log({ val })
        //     }
        //     return [key, val]
        //   })
        //   return newTabEntries
        // })
        // console.log({
        //   ...ct,
        //   json: JSON.stringify(Object.fromEntries(newTabs))
        // })
      });
    });
})();
