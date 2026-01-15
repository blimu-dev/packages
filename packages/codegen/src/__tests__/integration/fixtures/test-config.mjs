export default {
  resources: {
    workspace: {
      roles: ["admin", "editor", "viewer"]
    },
    environment: {
      roles: ["admin", "viewer"]
    },
    project: {
      roles: ["admin", "editor", "viewer"]
    }
  },
  entitlements: {
    "workspace:read": {
      roles: ["admin", "editor", "viewer"]
    },
    "workspace:create": {
      roles: ["admin"]
    },
    "workspace:manage": {
      roles: ["admin"]
    },
    "environment:read": {
      roles: ["admin", "viewer"]
    },
    "environment:create": {
      roles: ["admin"]
    },
    "environment:manage": {
      roles: ["admin"]
    }
  },
  plans: {
    free: {
      name: "Free Plan",
      summary: "Perfect for getting started",
      resource_limits: {
        workspace_count: 1,
        environment_count: 3
      },
      usage_based_limits: {
        api_calls: {
          value: 1000,
          period: "monthly"
        }
      }
    },
    pro: {
      name: "Pro Plan",
      summary: "For growing teams",
      resource_limits: {
        workspace_count: 10,
        environment_count: 50
      },
      usage_based_limits: {
        api_calls: {
          value: 10000,
          period: "monthly"
        },
        storage: {
          value: 100,
          period: "monthly"
        }
      }
    },
    enterprise: {
      name: "Enterprise Plan",
      summary: "For large organizations"
      // No limits = unlimited
    }
  }
};
