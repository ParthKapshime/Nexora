import { ResourceCollectionPage } from '../components/ResourceCollectionPage.jsx'

export default function LearningPage() {
  return <ResourceCollectionPage kind="roadmaps" eyebrow="MAKE ROOM TO GROW" title="Learning roadmap" description="Organize the learning milestones and resources you choose to work on." fields={[{ name: 'title', label: 'Milestone or topic', placeholder: 'e.g. Practice SQL joins' }, { name: 'week', label: 'Target week', placeholder: 'e.g. Week 1' }, { name: 'resource', label: 'Resource', placeholder: 'A course, article, or your notes', type: 'textarea' }]} emptyTitle="Your learning plan starts here" emptyDescription="Add a milestone you want to work toward." doneKey="completed" notice="Roadmap generation isn’t available from the current API. These milestones are the ones you add and track." />
}
