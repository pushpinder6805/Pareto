import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { ajax } from "discourse/lib/ajax";

export default class GroupsCard extends Component {
  @tracked groups = [];

  constructor() {
    super(...arguments);
    this.loadGroups();
  }

  async loadGroups() {
    const username =
      this.args?.model?.user?.username ||
      this.args?.model?.username ||
      this.args?.user?.username;

    if (!username) return;

    try {
      const data = await ajax(`/u/${username}.json`);
      this.groups = (data?.user?.groups || []).filter(
        (g) => !["everyone", "trust_level_0"].includes(g.name)
      );
      console.log("✅ Tracked groups set:", this.groups);
    } catch (e) {
      console.warn("❌ user-card-groups fetch failed:", e);
    }
  }
}

