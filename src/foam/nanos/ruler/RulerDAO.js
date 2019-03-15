/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.ruler',
  name: 'RulerDAO',
  extends: 'foam.dao.ProxyDAO',

  documentation: `
    RulerDAO selects all the rules that can be applied to specific dao depending on type of operation(create/update/remove). Selected rules are applied
    in the order specified in rule.priority until all are executed or until one of the rules forces execution to stop.
    See RulerDAOTest for examples. 
  `,

  javaImports: [
    'foam.core.FObject',
    'foam.dao.ArraySink',
    'foam.dao.DAO',
    'foam.mlang.order.Desc',
    'foam.mlang.predicate.Predicate',
    'foam.mlang.sink.GroupBy',
    'java.util.List',
    'static foam.mlang.MLang.*',
    'foam.dao.Sink',
    'foam.dao.AbstractSink',
    'foam.core.Detachable',
    'java.util.HashMap',
    'java.util.Map'
  ],

  constants: {
    PUT_CMD: 'PUT_CMD'
  },

  properties: [
    {
      class: 'String',
      name: 'daoKey',
      documentation: 'The dao name that rule needs to be applied on.'
    },
    // {
    //   class: 'FObjectProperty',
    //   of: 'foam.mlang.sink.GroupBy',
    //   name: 'createBefore'
    // },
    {
      class: 'FObjectProperty',
      of: 'foam.mlang.predicate.Predicate',
      name: 'createBefore',
      javaFactory: `
      return AND(
        OR(
          EQ(Rule.OPERATION, Operations.CREATE),
          EQ(Rule.OPERATION, Operations.CREATE_OR_UPDATE)
        ),
        EQ(Rule.AFTER, false)
      );`
    },
    // {
    //   class: 'FObjectProperty',
    //   of: 'foam.mlang.predicate.Predicate',
    //   name: 'createAfter'
    // },
    {
      class: 'FObjectProperty',
      of: 'foam.mlang.predicate.Predicate',
      name: 'createAfter',
      javaFactory: `
      return AND(
        OR(
          EQ(Rule.OPERATION, Operations.CREATE),
          EQ(Rule.OPERATION, Operations.CREATE_OR_UPDATE)
        ),
        EQ(Rule.AFTER, true)
      );`
    },
    {
      class: 'FObjectProperty',
      of: 'foam.mlang.predicate.Predicate',
      name: 'updateBefore',
      javaFactory: `
      return AND(
        OR(
          EQ(Rule.OPERATION, Operations.UPDATE),
          EQ(Rule.OPERATION, Operations.CREATE_OR_UPDATE)
        ),
        EQ(Rule.AFTER, false)
      );`
    },
    {
      class: 'FObjectProperty',
      of: 'foam.mlang.predicate.Predicate',
      name: 'updateAfter',
      javaFactory: `
      return AND(
        OR(
          EQ(Rule.OPERATION, Operations.UPDATE),
          EQ(Rule.OPERATION, Operations.CREATE_OR_UPDATE)
        ),
        EQ(Rule.AFTER, true)
      );`
    },
    {
      class: 'FObjectProperty',
      of: 'foam.mlang.predicate.Predicate',
      name: 'removeBefore',
      javaFactory: `
      return AND(
        EQ(Rule.OPERATION, Operations.REMOVE),
        EQ(Rule.AFTER, false)
      );`
    },
    {
      class: 'FObjectProperty',
      of: 'foam.mlang.predicate.Predicate',
      name: 'removeAfter',
      javaFactory: `
      return AND(
        EQ(Rule.OPERATION, Operations.REMOVE),
        EQ(Rule.AFTER, true)
      );`
    },
    {
      class: 'Map',
      name: 'hm',
      javaFactory: `
      return new java.util.HashMap<Predicate, GroupBy>();
      `
    }
  ],

  methods: [
    {
      name: 'put_',
      javaCode: `
      FObject oldObj = getDelegate().find_(x, obj);
      Map hm = getHm();
      if ( oldObj == null ) {
        applyRules(x, obj, oldObj, (GroupBy) hm.get(getCreateBefore()));
      } else {
        applyRules(x, obj, oldObj, (GroupBy) hm.get(getUpdateBefore()));
      }
      FObject ret =  getDelegate().put_(x, obj);
      if ( oldObj == null ) {
        applyRules(x, ret, oldObj, (GroupBy) hm.get(getCreateAfter()));
      } else {
        applyRules(x, ret, oldObj, (GroupBy) hm.get(getUpdateAfter()));
      }
      return ret;
      `
    },
    {
      name: 'remove_',
      javaCode: `
      FObject oldObj = getDelegate().find_(x, obj);
      applyRules(x, obj, oldObj, (GroupBy) getHm().get(getRemoveBefore()));
      FObject ret =  getDelegate().remove_(x, obj);
      applyRules(x, ret, oldObj, (GroupBy) getHm().get(getRemoveAfter()));
      return ret;
      `
    },
    {
      name: 'applyRules',
      args: [
        {
          name: 'x',
          type: 'Context'
        },
        {
          name: 'obj',
          type: 'foam.core.FObject'
        },
        {
          name: 'oldObj',
          type: 'foam.core.FObject'
        },
        {
          name: 'sink',
          type: 'foam.mlang.sink.GroupBy'
        }
      ],
      javaCode: `
      //GroupBy groups = (GroupBy) dao.select(GROUP_BY(Rule.RULE_GROUP, new ArraySink()));
      for ( Object key : sink.getGroupKeys() ) {
        List<Rule> group = ((ArraySink) sink.getGroups().get(key)).getArray();
        if ( ! group.isEmpty() ) {
          new RuleEngine(x, this).execute(group, obj, oldObj);
        }
      }
      `
    },
    {
      name: 'updateRules',
      args: [
        {
          name: 'x',
          type: 'Context'
        }
      ],
      javaCode: `DAO ruleDAO = ((DAO) x.get("ruleDAO")).where(EQ(Rule.DAO_KEY, getDaoKey()))
      .orderBy(new Desc(Rule.PRIORITY));
Map hm = getHm();
GroupBy createdBefore = (GroupBy) ruleDAO.where(getCreateBefore()).select(GROUP_BY(Rule.RULE_GROUP, new ArraySink()));
hm.put(getCreateBefore(), createdBefore);
GroupBy updatedBefore = (GroupBy) ruleDAO.where(getUpdateBefore()).select(GROUP_BY(Rule.RULE_GROUP, new ArraySink()));
hm.put(getUpdateBefore(), updatedBefore);
GroupBy createdAfter = (GroupBy) ruleDAO.where(getCreateAfter()).select(GROUP_BY(Rule.RULE_GROUP, new ArraySink()));
hm.put(getCreateAfter(), createdAfter);
GroupBy updatedAfter = (GroupBy) ruleDAO.where(getUpdateAfter()).select(GROUP_BY(Rule.RULE_GROUP, new ArraySink()));
hm.put(getUpdateAfter(), updatedAfter);
GroupBy removedBefore = (GroupBy) ruleDAO.where(getRemoveBefore()).select(GROUP_BY(Rule.RULE_GROUP, new ArraySink()));
hm.put(getRemoveBefore(), removedBefore);
GroupBy removedAfter = (GroupBy) ruleDAO.where(getRemoveAfter()).select(GROUP_BY(Rule.RULE_GROUP, new ArraySink()));
hm.put(getRemoveAfter(), removedAfter);
setHm(hm);
// ruleDAO.listen(new AbstractSink() {
//   @Override
//   public void put(Object obj, Detachable sub) {
//     Map hm = getHm();
//     for ( Object key : hm.keySet() ) {
//       if ( ((Predicate) key).f(obj) ) {
//          //((DAO)hm.get(key)).put((FObject)obj);
//          //setHm(hm);
//       }
//     }
//   }
// }, null);
        `
    },
    {
      name: 'cmd_',
      javaCode: `
        if ( PUT_CMD == obj ) {
          getDelegate().put((FObject) x.get("OBJ"));
          return true;
        }
        return super.cmd(obj);
      `
    }
  ],

  axioms: [
    {
      name: 'javaExtras',
      buildJavaClass: function(cls) {
        cls.extras.push(`
         public RulerDAO(foam.core.X x, foam.dao.DAO delegate, String serviceName) {
           setX(x);
           setDelegate(delegate);
           setDaoKey(serviceName);
           updateRules(x);
         }
        `);
      }
    }
  ]
});