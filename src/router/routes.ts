import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      public: true,
      title: '登录'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: {
      public: true,
      title: '注册'
    }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/ForbiddenView.vue'),
    meta: {
      public: true,
      title: '无权限'
    }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: {
      public: true,
      title: '页面不存在'
    }
  },
  {
    path: '/',
    component: () => import('@/layouts/UserLayout.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/user/DashboardView.vue'),
        meta: {
          title: '工作台'
        }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/user/ProfileView.vue'),
        meta: {
          title: '个人资料'
        }
      },
      {
        path: 'password',
        name: 'Password',
        component: () => import('@/views/user/PasswordView.vue'),
        meta: {
          title: '修改密码'
        }
      },
      {
        path: 'questions',
        name: 'QuestionList',
        component: () => import('@/views/question/QuestionListView.vue'),
        meta: {
          title: '题库'
        }
      },
      {
        path: 'questions/wrong-records',
        name: 'WrongQuestions',
        component: () => import('@/views/question/WrongQuestionView.vue'),
        meta: {
          title: '错题本'
        }
      },
      {
        path: 'questions/favorites',
        name: 'FavoriteQuestions',
        component: () => import('@/views/question/FavoriteQuestionView.vue'),
        meta: {
          title: '收藏题目'
        }
      },
      {
        path: 'questions/:id',
        name: 'QuestionDetail',
        component: () => import('@/views/question/QuestionDetailView.vue'),
        meta: {
          title: '题目详情'
        }
      },
      {
        path: 'resumes',
        name: 'ResumeList',
        component: () => import('@/views/resume/ResumeListView.vue'),
        meta: {
          title: '简历'
        }
      },
      {
        path: 'resumes/create',
        name: 'ResumeCreate',
        component: () => import('@/views/resume/ResumeEditView.vue'),
        meta: {
          title: '新建简历'
        }
      },
      {
        path: 'resumes/:id/edit',
        name: 'ResumeEdit',
        component: () => import('@/views/resume/ResumeEditView.vue'),
        meta: {
          title: '编辑简历'
        }
      },
      {
        path: 'interviews/create',
        name: 'InterviewCreate',
        component: () => import('@/views/interview/InterviewCreateView.vue'),
        meta: {
          title: '创建面试'
        }
      },
      {
        path: 'interviews/room/:id',
        name: 'InterviewRoom',
        component: () => import('@/views/interview/InterviewRoomView.vue'),
        meta: {
          title: '面试房间'
        }
      },
      {
        path: 'interviews/history',
        name: 'InterviewHistory',
        component: () => import('@/views/interview/InterviewHistoryView.vue'),
        meta: {
          title: '面试历史'
        }
      },
      {
        path: 'interviews/:id',
        name: 'InterviewDetail',
        component: () => import('@/views/interview/InterviewDetailView.vue'),
        meta: {
          title: '面试详情'
        }
      },
      {
        path: 'interviews/:id/report',
        name: 'InterviewReport',
        component: () => import('@/views/interview/InterviewReportView.vue'),
        meta: {
          title: '面试报告'
        }
      }
    ]
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/AdminDashboardView.vue'),
        meta: {
          title: '管理首页'
        }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UserManageView.vue'),
        meta: {
          title: '用户管理'
        }
      },
      {
        path: 'roles',
        name: 'AdminRoles',
        component: () => import('@/views/admin/RoleManageView.vue'),
        meta: {
          title: '角色管理'
        }
      },
      {
        path: 'questions',
        name: 'AdminQuestions',
        component: () => import('@/views/admin/QuestionManageView.vue'),
        meta: {
          title: '题目管理'
        }
      },
      {
        path: 'question-categories',
        name: 'AdminQuestionCategories',
        component: () => import('@/views/admin/QuestionCategoryManageView.vue'),
        meta: {
          title: '分类管理'
        }
      },
      {
        path: 'question-tags',
        name: 'AdminQuestionTags',
        component: () => import('@/views/admin/QuestionTagManageView.vue'),
        meta: {
          title: '标签管理'
        }
      },
      {
        path: 'question-groups',
        name: 'AdminQuestionGroups',
        component: () => import('@/views/admin/QuestionGroupManageView.vue'),
        meta: {
          title: '问题组管理'
        }
      },
      {
        path: 'ai/prompts',
        name: 'AdminAiPrompts',
        component: () => import('@/views/admin/PromptTemplateView.vue'),
        meta: {
          title: 'Prompt 模板'
        }
      },
      {
        path: 'ai/logs',
        name: 'AdminAiLogs',
        component: () => import('@/views/admin/AiCallLogView.vue'),
        meta: {
          title: 'AI 调用日志'
        }
      },
      {
        path: 'system/configs',
        name: 'AdminSystemConfigs',
        component: () => import('@/views/admin/SystemConfigView.vue'),
        meta: {
          title: '系统配置'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]
