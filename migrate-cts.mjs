import fs from "fs";
import dotenv from "dotenv";
import fetch from "node-fetch";
import _ from "lodash";
import migrate from "slice-machine-ui/build/lib/migrate.js";

dotenv.config();

const auth = process.env.TOKEN;
const HEADERS = {
  repository: process.env.REPO,
  Authorization: `Bearer ${auth}`,
};

var logs = {
  merged_slices: [],
  created_slices: [],
  slice_zones: []
};

const handleSlicezone = (sz, ct) => {
  return {
    ...sz,
    config: {
      ...sz.config,
      choices: Object.fromEntries(
        Object.entries(sz.config.choices).map(([key, val]) => {
          // If slice folder doesn't exist create it
          if (!fs.existsSync(`./slices/${key}`)) {
            fs.mkdirSync(`./slices/${key}`);
            let data = JSON.stringify(
              {
                ...migrate.default(
                  val,
                  { sliceName: key, from: "slices" },
                  { cwd: "./" },
                  false
                ).model,
                migrated: undefined,
              },
              null,
              2
            );

            fs.writeFileSync(`./slices/${key}/model.json`, data);

            // Create slice index.js, need to write the teplate file as well or is it in slicemachine ui ?
            // fs.writeFileSync(
            //   `./slices/${key}/index.js`,
            // );

            return [key, { type: "SharedSlice" }];

          } else {

            // Compare the slice model.json, if it has the same structure -> ignore

            let original = JSON.parse(
              fs.readFileSync(`./slices/${key}/model.json`)
            );

            let duplicate = {
              ...migrate.default(
                val,
                { sliceName: key, from: "slices" },
                { cwd: "./" },
                false
              ).model,
            };

            if (
              _.isEqual(duplicate.id, original.id) &&
              _.isEqual(duplicate.name, original.name) &&
              _.isEqual(
                duplicate.variations[0].primary,
                original.variations[0].primary
              ) &&
              _.isEqual(
                duplicate.variations[0].items,
                original.variations[0].items
              )
            ) {
              var slice = {};
              slice["legacy_id"] = key;
              slice["type"] = ct.id;
              slice["new_id"] = `${key}`;

              logs.merged_slices.push(slice);

              // console.log("MERGED", slice);

              return [key, { type: "SharedSlice" }];

            } else {

              fs.mkdirSync(`./slices/${key}_type_${ct.id}`);

              let str = JSON.stringify(
                {
                  ...migrate.default(
                    val,
                    { sliceName: key, from: "slices" },
                    { cwd: "./" },
                    false
                  ).model,
                  migrated: undefined,
                },
                null,
                2
              );

              str = str.replace(
                `\"id\": \"${key}\"`,
                `\"id\": \"${key}_type_${ct.id}\"`
              );

              str = str.replace(
                `\"name\": \"${key}\"`,
                `\"name\": \"${key}_type_${ct.id}\"`
              );

              fs.writeFileSync(`./slices/${key}_type_${ct.id}/model.json`, str);

              var slice = {};
              slice["legacy_id"] = key;
              slice["type"] = ct.id;
              slice["new_id"] = `${key}_type_${ct.id}`;

              logs.created_slices.push(slice);

              // console.log(`CREATE NEW SLICE CALLED ${key}_type_${ct.id}`);
              // console.log("CREATED", slice);

              return [`${key}_type_${ct.id}`, { type: "SharedSlice" }];

            }

            // console.log(
            //   `Slice ${key} already exist in type ${ct.label}, ID: ${ct.id} \nAction you can take: `,
            //   `\n - To make a variation of ${key}_type_${ct.id} in /slices/${key}, follow the Migration guide before deleting /slices/${key}_type_${ct.label}`,
            // );

            //
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
      // str = str.replaceAll('"body":', '"slices":'); // can remove, doesn't matter but remove in migrate-content as well
      cts = JSON.parse(str);
      fs.mkdirSync("./customtypes");
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

                        // Add tabs slice zone to logs
                        var slice_zone = {};
                        slice_zone["type"] = ct.id;
                        slice_zone["tab"] = tabKey;
                        slice_zone["id"] = fieldKey;

                        logs.slice_zones.push(slice_zone);

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

        fs.mkdirSync(`./customtypes/${newCt.id}`);
        fs.writeFileSync(
          `./customtypes/${newCt.id}/index.json`,
          JSON.stringify(newCt, null, 2)
        );
      });

      // Create log file
      fs.writeFileSync(`./logs.json`, JSON.stringify(logs, null, 2));
    });
})();
