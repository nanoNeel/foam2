/**
 * @license
 * Copyright 2017 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

package foam.nanos.http;

import foam.core.*;

import javax.servlet.http.HttpServletRequest;
import java.io.*;
import java.lang.Exception;
import java.util.Date;

public class PingService
  implements WebAgent
{
  public PingService() {}

  @Override
  public void execute(X x) {

    HttpServletRequest httpServletRequest = x.get(HttpServletRequest.class);
    try {

      String body = getBody(httpServletRequest);
      System.out.println(body);

    } catch (IOException e) {
      e.printStackTrace();
    }


    System.out.println("PONG");
    PrintWriter out = x.get(PrintWriter.class);
    out.println("Pong: " + new Date());
  }

  public static String getBody(HttpServletRequest request) throws IOException {

    String body = null;
    StringBuilder stringBuilder = new StringBuilder();
    BufferedReader bufferedReader = null;

    try {
      InputStream inputStream = request.getInputStream();
      if (inputStream != null) {
        bufferedReader = new BufferedReader(new InputStreamReader(inputStream));
        char[] charBuffer = new char[128];
        int bytesRead = -1;
        while ((bytesRead = bufferedReader.read(charBuffer)) > 0) {
          stringBuilder.append(charBuffer, 0, bytesRead);
        }
      } else {
        stringBuilder.append("");
      }
    } catch (IOException ex) {
      throw ex;
    } finally {
      if (bufferedReader != null) {
        try {
          bufferedReader.close();
        } catch (IOException ex) {
          throw ex;
        }
      }
    }

    body = stringBuilder.toString();
    return body;
  }
}
