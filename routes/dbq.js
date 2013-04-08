
/*
 * GET data from db
 */

exports.getdata = function(req, res){
    
    var dbloc = 'mongodb://sd_dbread:5d@sd-work9.ece.vt.edu/rbsp';

    var sdt = new Date(req.query.sdt);
    var edt = new Date(req.query.edt);

    require('mongodb').MongoClient.connect(dbloc, function(err, db) {

        if(!err) {
            console.log("We are connected");
        } else {
            console.log(err);
        }

        db.collection('ephemeris', function(err, coll){

            coll.find({'time': {'$gte': sdt, '$lte': edt}}, 
                {'time': true, 'L': true, 'scraft': true, 
                'lonNH': true, 'latNH': true, 'lonSH': true, 'latSH': true})
                .toArray(function(err, docs){

                    res.type('application/json');
                    res.send( docs );

            });

        });

    });
};