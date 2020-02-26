/**
 * @license
 * Copyright 2018 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

package foam.lib.query;

import foam.lib.parse.*;
import foam.mlang.Constant;
import java.util.Date;

//YYYY
//YYYY-MM               YYYY/MM
//YYYY-MM-DD            YYYY/MM/DD
//YYYY-MM-DDTHH         YYYY/MM/DDTHH
//YYYY-MM-DDTHH:MM      YYYY/MM/DDTHH:MM
//YYYY-MM-DD..YYYY-MM-DDYYYY-MM-DD..YYYY-MM-DD
//today
//today-7
public class DuringExpressionParser
  extends ProxyParser
{

  private final static Parser instance__ = new DuringExpressionParser();

  public static Parser instance() { return instance__; }


  private DuringExpressionParser() {
    super(
      new Alt(
          //YYYY-MM-DD..YYYY-MM-DD
          new YYYYMMDDRangeDateParser(),

          //YYYY-MM-DDTHH:MM
          //YYYY-MM-DDTHH
          //YYYY-MM-DD
          //YYYY-MM
          //YYYY
          new YYYYMMDDLiteralDateParser(),

          //TODO new LongParser(),

          //today-7
          //today
          new RelativeDateParser()));
  }

  public PStream parse(PStream ps, ParserContext x) {
    ps = super.parse( ps, x );
    if ( ps == null ) return null;

    if ( ps.value() instanceof java.lang.Long ) {
      return ps.setValue( new java.util.Date(( java.lang.Long ) ps.value()));
    }

    Object[] result;
    result = (Object[]) ps.value();

    if ( ps.value() instanceof Object[] ) {
      result = (Object[]) ps.value();

      Constant d1 = new foam.mlang.Constant((( Date[]) ps.value())[0]);
      Constant d2 = new foam.mlang.Constant((( Date[]) ps.value())[1]);
      Constant[] d = { d1, d2 };

      return ps.setValue( d );
    }

    if ( ps.value() != null ) {
      return ps.setValue(result);
    }

    return null;
  }
}
