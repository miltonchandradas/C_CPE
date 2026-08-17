using {
    cuid,
    managed
} from '@sap/cds/common';

namespace taskruns;

entity TaskRuns : cuid, managed {
    name          : String(255);
    startedAt     : Timestamp;
    finishedAt    : Timestamp;
    status        : String enum {
        Pending;
        Running;
        Completed;
        Failed;
        Cancelled
    };
    message       : String(1000);
    triggerSource : String(255);
    priority      : Integer default 0;
}
