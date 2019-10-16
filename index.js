const mergeArrayByName = require('./lib/mergeArrayByName')

module.exports = (robot, _, Settings = require('./lib/settings')) => {
  robot.on('push', async context => {
    const payload = context.payload
    const defaultBranch = payload.ref === 'refs/heads/' + payload.repository.default_branch

    const config = await context.config('settings.yml', {}, { arrayMerge: mergeArrayByName })
    const checkOptions = {
      owner: context.repo().owner,
      repo: context.repo().repo,
      name: "Settings",
      head_sha: payload.after,
      status: "completed"
    }

    const settingsModified = payload.commits.find(commit => {
      return commit.added.includes(Settings.FILE_NAME) ||
        commit.modified.includes(Settings.FILE_NAME)
    })

    if (defaultBranch && settingsModified) {
      return Settings.sync(context.github, context.repo(), config)
        .then(() => {
          checkOptions.conclusion = "success"
        }).catch(res => {
          checkOptions.conclusion = "failure"
          const summary = `
There was an error while updating the repository settings.

<details><summary>Failed response</summary>
  <pre>
  ${JSON.stringify(JSON.parse(res.message), null, 2)}
  </pre>
</details>
`
          checkOptions.output = {
            title: "Settings Probot",
            summary: summary
          }
      }).then(() => {
        context.github.checks.create(checkOptions)
          .catch((err) => {
            // Incase the check api has not been authorized 
            console.error(err)
          })
      })
    }
  })
}
