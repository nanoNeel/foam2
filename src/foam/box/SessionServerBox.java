/**
 * @license
 * Copyright 2017 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

package foam.box;

import foam.core.X;
import foam.dao.DAO;
import foam.nanos.app.AppConfig;
import foam.nanos.auth.AuthService;
import foam.nanos.auth.*;
import foam.nanos.auth.AuthenticationException;
import foam.nanos.auth.AuthorizationException;
import foam.nanos.boot.NSpec;
import foam.nanos.logger.*;
import foam.nanos.logger.PrefixLogger;
import foam.nanos.session.Session;
import java.util.Date;
import javax.naming.NoPermissionException;
import javax.servlet.http.HttpServletRequest;

public class SessionServerBox
  extends ProxyBox
{
  protected boolean authenticate_;

  public SessionServerBox(X x, Box delegate, boolean authenticate) {
    super(x, delegate);
    authenticate_ = authenticate;
  }

  public void send(Message msg) {
    String sessionID = (String) msg.getAttributes().get("sessionId");
    Logger logger    = (Logger) getX().get("logger");

    try {
      if ( sessionID != null ) {
        NSpec              spec       = getX().get(NSpec.class);
        HttpServletRequest req        = getX().get(HttpServletRequest.class);
        AuthService        auth       = (AuthService) getX().get("auth");
        DAO                sessionDAO = (DAO)         getX().get("localSessionDAO");
        Session            session    = (Session)     sessionDAO.find(sessionID);

        if ( session == null ) {
          session = new Session();
          session.setId(sessionID);
          session.setRemoteHost(req.getRemoteHost());
          // Prevent the system user and group from leaking into new contexts.
          session.setContext(getX().put("user", null).put("group", null).put(Session.class, session));
          sessionDAO.put(session);
        } else if ( ! session.getRemoteHost().equals(req.getRemoteHost()) ) {
          // If an existing session is reused with a different remote host then
          // logout the session and force a re-login.
//          logger.warning("Attempt to use session create for ", session.getRemoteHost(), " from ", req.getRemoteHost());
//          session.setContext(getX().put(Session.class, session));
//          session.setRemoteHost(req.getRemoteHost());
//          sessionDAO.put(session);
        }

        User user = (User) session.getContext().get("user");
        X    x    = session.getContext()
          .put(
            "logger",
            new PrefixLogger(
                new Object[] { user == null ? "" : user.getId() + " - " + user.label(), "[Service]", spec.getName() },
                (Logger) session.getContext().get("logger")))
          .put(HttpServletRequest.class, req);

        session.touch();

        // If this service has been configured to require authentication, then
        // throw an error if there's no user in the context.
        if ( authenticate_ && session.getUserId() == 0 ) {
          msg.replyWithException(new AuthenticationException());
          return;
        }

        if ( user != null ) {
          Group group = (Group) x.get("group");

          if ( group == null ) {
            logger.warning(String.format("The context with id = %s does not have the group set in the context.", session.getId()));
          } else {
            AppConfig appConfig = group.getAppConfig(x);
            x = x.put("appConfig", appConfig);
            session.getContext().put("appConfig", appConfig);
          }

          if ( authenticate_ && ! auth.check(session.getContext(), "service." + spec.getName()) ) {
            msg.replyWithException(new AuthorizationException("You do not have permission to access that service."));
            return;
          }
        }

        msg.getLocalAttributes().put("x", x);
      }
    } catch (Throwable t) {
      logger.error(t);
      t.printStackTrace();
      return;
    }

    getDelegate().send(msg);
  }
}
