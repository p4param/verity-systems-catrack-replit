import { NavigationService } from './src/modules/platform/navigation/services/navigation-service';

async function main() {
  const service = new NavigationService();
  const sidebar = await service.generateSidebar([], 'Admin');
  console.log('Sidebar groups:', sidebar.length);
  sidebar.forEach(g => {
     console.log(`Group: ${g.name} - items: ${g.items.length}`);
  });
}

main().catch(console.error);

