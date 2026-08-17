using { taskruns.TaskRuns } from '../db/schema';

service TaskService {
  entity TaskRuns as projection on TaskRuns;
}
