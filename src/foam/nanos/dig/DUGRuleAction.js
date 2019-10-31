foam.CLASS({
  package: 'foam.nanos.dig',
  name: 'DUGRuleAction',

  documentation: 'Rule action for DUG',

  implements: [
    'foam.nanos.ruler.RuleAction'
  ],

  javaImports: [
    'foam.core.ContextAgent',
    'foam.core.X',
    'foam.dao.HTTPSink'
  ],


  properties: [
    {
      class: 'URL',
      name: 'url'
    },
    {
      class: 'foam.core.Enum',
      of: 'foam.nanos.http.Format',
      name: 'format',
    },
  ],

  methods: [
    {
      name: 'applyAction',
      javaCode: `
        agency.submit(x, new ContextAgent() {
          @Override
          public void execute(X x) {
            HTTPSink sink = null;
            try {
              sink = new HTTPSink(getUrl(), getFormat());
            } catch (Exception e) {
            }
            sink.put(obj, null);
          }
        }, "DUG Rule (url: " + getUrl() + " )");
      `
    }
  ]
});
