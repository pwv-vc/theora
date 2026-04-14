/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import { getSettingsInfo } from '../../lib/settings.js'
import { Layout } from '../pages/layout.js'
import { SettingsPage } from '../pages/settings.js'

export const settingsRoutes = new Hono()

settingsRoutes.get('/', (c) => {
  const info = getSettingsInfo()
  const kbName = info.kbConfig?.name ?? 'Knowledge Base'

  return c.html(
    <Layout title={`Settings — ${kbName}`} active="settings">
      <SettingsPage info={info} />
    </Layout>
  )
})
