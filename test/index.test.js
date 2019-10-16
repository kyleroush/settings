const { Application } = require('probot')
const plugin = require('../index')

describe('plugin', () => {
  let app, event, sync, github

  beforeEach(() => {
    app = new Application()
    github = {
      repos: {
        getContents: jest.fn(() => Promise.resolve({ data: { content: '' } }))
      },
      checks: {
        create: jest.fn(() => Promise.resolve())
      }
    }
    app.auth = () => Promise.resolve(github)

    event = {
      name: 'push',
      payload: JSON.parse(JSON.stringify(require('./fixtures/events/push.settings.json')))
    }
    sync = jest.fn(() => Promise.resolve())

    plugin(app, {}, { sync, FILE_NAME: '.github/settings.yml' })
  })

  describe('with settings modified on master', () => {
    it('syncs settings', async () => {
      await app.receive(event)
      expect(sync).toHaveBeenCalled()
    })

    it('a check is created', async () => {
      await app.receive(event)
      expect(github.checks.create).toHaveBeenCalled()
    })

    describe('the settings are synced successfully', () => {
      it('a check is created as a success', async () => {
        await app.receive(event)
        expect(github.checks.create).toHaveBeenCalledWith(expect.objectContaining({
          conclusion: 'success'
        }))
      })
    })

    describe('there is an error when syncing the settings', () => {
      beforeEach(() => {
        const error = new Error()
        error.message = '{}'
        sync = jest.fn(() => Promise.reject(error))
        plugin(app, {}, { sync, FILE_NAME: '.github/settings.yml' })
      })
      it('a check is created as a failure', async () => {
        await app.receive(event)
        expect(github.checks.create).toHaveBeenCalledWith(expect.objectContaining({
          conclusion: 'failure'
        }))
      })
    })
  })

  describe('on another branch', () => {
    beforeEach(() => {
      event.payload.ref = 'refs/heads/other-branch'
    })

    it('does not sync settings', async () => {
      await app.receive(event)
      expect(sync).not.toHaveBeenCalled()
    })
  })

  describe('with other files modified', () => {
    beforeEach(() => {
      event.payload = require('./fixtures/events/push.readme.json')
    })

    it('does not sync settings', () => {
      app.receive(event)
      expect(sync).not.toHaveBeenCalled()
    })
  })
})
