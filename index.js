const mergeArrayByName = require('./lib/mergeArrayByName')

module.exports = (robot, _, Settings = require('./lib/settings')) => {
  robot.on('push', async context => {
    const payload = context.payload
    const defaultBranch = payload.ref === 'refs/heads/' + payload.repository.default_branch

    const config = await context.config('settings.yml', {}, { arrayMerge: mergeArrayByName })

    const settingsModified = payload.commits.find(commit => {
      return commit.added.includes(Settings.FILE_NAME) ||
        commit.modified.includes(Settings.FILE_NAME)
    })

    if (defaultBranch && settingsModified) {
      return Settings.sync(context.github, context.repo(), config).then(() => {
        context.github.checks.create({
          owner: context.repo().owner,
          repo: context.repo().repo,
          name: "Settings Probot",
          head_sha: payload.after,
          status: "completed",
          conclusion: "success"
        })
      }).catch(res => {
  
        const summary = `
  There was an error while updating the settings.
  
  <details><summary>Failed response</summary>
  <pre>
  ${JSON.stringify(JSON.parse(res.message), null, 2)}
  </pre>
  </details>
`
        context.github.checks.create({
          owner: context.repo().owner,
          repo: context.repo().repo,
          name: "Settings Probot",
          head_sha: payload.after,
          status: "completed",
          conclusion: "failure",
          output: {
            title: "Settings Probot",
            summary: summary
          }
        })    
      })
    }
  })
}
