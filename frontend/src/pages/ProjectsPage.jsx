import { ResourceCollectionPage } from '../components/ResourceCollectionPage.jsx'

export default function ProjectsPage() {
  return <ResourceCollectionPage kind="projects" eyebrow="SHOW WHAT YOU CAN DO" title="Projects" description="Collect portfolio ideas you plan to build or have completed." fields={[{ name: 'title', label: 'Project name', placeholder: 'e.g. Personal finance dashboard' }, { name: 'description', label: 'Description', placeholder: 'What would you build?', type: 'textarea' }, { name: 'technologies', label: 'Technologies', placeholder: 'e.g. React, JavaScript, MongoDB' }, { name: 'difficulty', label: 'Difficulty', placeholder: 'e.g. Beginner, Intermediate' }]} emptyTitle="No project ideas yet" emptyDescription="Add an idea you want to explore." notice="The current API doesn’t provide generated project recommendations. Add and manage your own portfolio ideas here." />
}
