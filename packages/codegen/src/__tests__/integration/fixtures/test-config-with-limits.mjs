export default {
  plans: {
    basic: {
      name: "Basic Plan",
      resource_limits: {
        workspace_count: 5,
        project_count: 20,
        team_member_count: 10
      },
      usage_based_limits: {
        api_calls: {
          value: 5000,
          period: "monthly"
        },
        storage_gb: {
          value: 50,
          period: "monthly"
        },
        webhook_calls: {
          value: 1000,
          period: "monthly"
        }
      }
    },
    premium: {
      name: "Premium Plan",
      resource_limits: {
        workspace_count: 50,
        project_count: 200
      },
      usage_based_limits: {
        api_calls: {
          value: 50000,
          period: "monthly"
        },
        storage_gb: {
          value: 500,
          period: "monthly"
        }
      }
    }
  }
};
