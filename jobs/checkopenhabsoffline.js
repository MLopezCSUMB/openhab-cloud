var cronJob = require('cron').CronJob
    , logger = require('../logger')
    , mailer = require('../mailer')
    // Mongoose models
    , User = require('../models/user')
    , Openhab = require('../models/openhab')
    , OpenhabConfig = require('../models/openhabconfig')
    , Event = require('../models/event')
    , UserAccount = require('../models/useraccount');

// This job checks for openhabs which has been offline for more then 3 days and sends warning emails to their
// owners, pointing out that we didn't see their openhabs for quite long time, not more then one email per 3 days

module.exports = new cronJob('00 00 00 * * *', function() {
    logger.info("openHAB-cloud: checkopenhabsoffline job started");
//    openhabs.find({status:'offline',last_online: {$lte:ISODate("2014-02-24T16:00:00.000X")}}).count()
    date3DaysAgo = new Date;
    date3DaysAgo.setDate(date3DaysAgo.getDate()-3);
    logger.info("openHAB-cloud: date3DaysAgo = " + date3DaysAgo);
    Openhab.find({status:'offline', last_online: {"$lt":date3DaysAgo}}, function(error, openhabs) {
        if (!error && openhabs) {
            logger.info("openHAB-cloud: Found " + openhabs.length + " openhabs");
    //        console.log(openhabs);
            for (var i in openhabs) {
                var openhab = openhabs[i];
                if (!openhab.last_email_notification || openhab.last_email_notification < date3DaysAgo) {
                    openhab.last_email_notification = new Date;
                    openhab.save();
//                    console.log(openhab.uuid + ":");
                    UserAccount.findOne({_id:openhab.account}, function(error, userAccount) {
                        if (!error && userAccount) {
                            User.find({account: userAccount.id, role:"master"}, function(error, users) {
                                if (!error && users) {
                                    for (var i in users) {
                                        var user = users[i];
                                        var locals = {
                                            email: user.username
                                        };
                                        mailer.sendEmail(user.username, "We are worried about your openHAB",
                                            "openhaboffline", locals, function(error) {
                                                if (!error) {
//                                                    logger.info("mail sent");
                                                } else
                                                    logger.error("openHAB-cloud: Error sending email: " + error);
                                            });
                                    }
                                }
                            });
                        } else if (error) {
                            logger.error("openHAB-cloud: Error finding user account for openhab: " + error);
                        } else {
                            logger.error("openHAB-cloud: Unable to find user account for openhab which is nonsense");
                        }
                    });
                }
            }
        } else if (error) {
            logger.error("openHAB-cloud: Error finding offline openHABs: " + error);
        } else {
            logger.info("openHAB-cloud: No offline openHABs found");
        }
    });
    logger.info("openHAB-cloud: checkopenhabsoffline job finished");
});
