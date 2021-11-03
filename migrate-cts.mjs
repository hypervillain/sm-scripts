import fs from 'fs'
import dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()
import migrate from 'slice-machine-ui/build/lib/migrate.js'

const auth = process.env.TOKEN
const HEADERS = {
  repository: process.env.REPO,
  Authorization: `Bearer ${auth}`,
};

const handleSlicezone = (sz) => {
  return {
    ...sz,
    config: {
      ...sz.config,
      choices: Object.fromEntries(
        Object.entries(sz.config.choices).map(([key, val]) => {
          fs.mkdirSync(`./slices/${key}`)
          fs.writeFileSync(
            `./slices/${key}/model.json`,
            JSON.stringify(
              {
                ...migrate.default(val, { sliceName: key, from: 'slices'}, { cwd: './' }),
                migrated: undefined
              },
              null,
              2
            )
          )
          return [key, { type: "SharedSlice" }]
        })
      )
    }
  }
}

;(() => {
fetch('https://customtypes.prismic.io/customtypes', {
  headers: HEADERS
}).then(res => res.json())
.then(cts => {
  fs.mkdirSync('./customtypes')
  fs.mkdirSync('./slices')
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
                  if (field.type === 'Slices') {
                    return [fieldKey, handleSlicezone(field)]
                  }
                  return [fieldKey, field]
                })
              )
            ]
          })
        )
      })()
    }

    fs.mkdirSync(`./customtypes/${newCt.id}`)
    fs.writeFileSync(`./customtypes/${newCt.id}/index.json`, JSON.stringify(newCt, null, 2))

    // const tabs = Object.entries(ct.json)
    // const newTabs = tabs.map(t => {
    //   const [tabKey, tab] = t
    //   const entries = Object.entries(tab)
    //   console.log({ entries, tab })

    //   const newTabEntries = entries.map((entry) => {
    //     const [key, val] = entry
    //     if (val.type === 'Slices') {
    //       console.log({ val })
    //     }
    //     return [key, val]
    //   })
    //   return newTabEntries
    // })
    // console.log({
    //   ...ct,
    //   json: JSON.stringify(Object.fromEntries(newTabs))
    // })
  })
})
})()