r"""Contacts serial class --- :mod:`ufcc.SerialContacts`
======================================================
:Authors: Daniel P. Ramirez & Besian I. Sejdiu
:Year: 2022
:Copyright: MIT License

UFCC calculates de distance-based contacts between two references.

The class and its methods
-------------------------
"""

import numpy as np
import scipy.stats
import scipy.sparse
import MDAnalysis as mda
from MDAnalysis.lib.distances import capped_distance
from MDAnalysis.analysis.base import AnalysisBase
from pmda.parallel import ParallelAnalysisBase


# import logging
# MDAnalysis.start_logging()

# logger = logging.getLogger("MDAnalysis.MDAKit.membrane_curvature")


class SerialContacts(AnalysisBase):
    r"""
    Class to get the distance-based contacts starting from two AtomGroups.
    """

    def __init__(self, universe, query, database, cutoff, **kwargs):

        super().__init__(universe.universe.trajectory, **kwargs)
        self.query = query
        self.database = database
        self.cutoff = cutoff

        # to allow for non-sequential resindices
        self._sorted_protein_resindices = scipy.stats.rankdata(self.query.resindices, method="dense") - 1
        self._sorted_membrane_resindices = scipy.stats.rankdata(self.database.resindices, method="dense") - 1

        # Raise if selection doesn't exist
        if len(self.query) == 0 or len(self.database) == 0:
            raise ValueError("Invalid selection. Empty AtomGroup(s).")

        if self.cutoff <= 0:
            raise ValueError("The cutoff must be greater than 0.")

        # # Apply wrapping coordinates
        # if not self.wrap:
        #     # Warning
        #     msg = (" `wrap == False` may result in inaccurate calculation "
        #            "of membrane curvature. Surfaces will be derived from "
        #            "a reduced number of atoms. \n "
        #            " Ignore this warning if your trajectory has "
        #            " rotational/translational fit rotations! ")
        #     warnings.warn(msg)
        #     logger.warn(msg)

    def _prepare(self):
        # Initialize empty np.array with results
        self.contacts = np.zeros(self.n_frames, dtype=object)

    def _single_frame(self):
        # Get the results and populate the results dictionary
        pairs = capped_distance(self.query.positions,
                                self.database.positions,
                                max_cutoff=self.cutoff,
                                box=self.database.dimensions,
                                return_distances=False)

        # Find unique pairs of residues interacting
        # Currently we have pairs of atoms
        query_residx, database_residx = np.unique(np.array(
            [[self._sorted_protein_resindices[pair[0]], self._sorted_membrane_resindices[pair[1]]] for pair in pairs]),
                                                  axis=0).T

        # store neighbours for this frame
        data = np.ones_like(query_residx)
        self.contacts[self._frame_index] = scipy.sparse.csr_matrix(
            (data, (query_residx, database_residx)),
            dtype=np.int8,
            shape=(self.query.n_residues, self.database.n_residues))

    # def _conclude(self):
    #     # OPTIONAL
    #     # Called once iteration on the trajectory is finished.
    #     # Apply normalisation and averaging to results here.
    #     self.result = np.asarray(self.result) / np.sum(self.result)


class ParallelContacts(ParallelAnalysisBase):
    r"""
    Class to get the distance-based contacts starting from two AtomGroups.
    """

    def __init__(self, universe, query, database, cutoff, **kwargs):

        super().__init__(universe.universe.trajectory, (query, database))
        self.query = query
        self.query_n_residues = self.query.n_residues
        self.database = database
        self.database_n_residues = self.database.n_residues
        self.cutoff = cutoff

        # to allow for non-sequential resindices
        self._sorted_protein_resindices = scipy.stats.rankdata(self.query.resindices, method="dense") - 1
        self._sorted_membrane_resindices = scipy.stats.rankdata(self.database.resindices, method="dense") - 1

        # Raise if selection doesn't exist
        if len(self.query) == 0 or len(self.database) == 0:
            raise ValueError("Invalid selection. Empty AtomGroup(s).")

        if self.cutoff <= 0:
            raise ValueError("The cutoff must be greater than 0.")

    def _prepare(self):
        # Initialize empty np.array with results
        self.contacts = None

    def _single_frame(self, ts, atomgroups):
        # Get the results and populate the results dictionary
        pairs = capped_distance(atomgroups[0].positions,
                                atomgroups[1].positions,
                                max_cutoff=self.cutoff,
                                box=atomgroups[1].dimensions,
                                return_distances=False)

        # Find unique pairs of residues interacting
        # Currently we have pairs of atoms
        query_residx, database_residx = np.unique(np.array(
            [[self._sorted_protein_resindices[pair[0]], self._sorted_membrane_resindices[pair[1]]] for pair in pairs]),
                                                  axis=0).T

        # store neighbours for this frame
        data = np.ones_like(query_residx)
        return (ts.frame,
                scipy.sparse.csr_matrix((data, (query_residx, database_residx)),
                                        dtype=np.int8,
                                        shape=(self.query_n_residues, self.database_n_residues)))

    def _conclude(self):
        self.contacts = np.array([l[1] for l in sorted(np.vstack(self._results), key=lambda tup: tup[0])])


class Runner(object):

    def __init__(self):
        self.backend = None
        self.n_jobs = -1
        # TODO
        # add funcionalities to run analysis on HPC machines


class Contacts(object):
    """Stores information on the contact analysis between system proteins and lipids.
    Instantiating the class only creates the object and populates a few attributes.
    """
    def __init__(self, query, database):
        self.query = query
        self.database = database
        self.runner = Runner()
        self.contacts = None

    def compute(self, cutoff=7):
        assert isinstance(
            self.query.AG,
            (mda.core.groups.AtomGroup),
        ), "the query has to be an AtomGroup"
        assert isinstance(
            self.database.AG,
            (mda.core.groups.AtomGroup),
        ), "the database has to be an AtomGroup"
        if self.runner.backend == None or self.runner.backend not in ['serial', 'parallel']:
            raise ValueError(
                "You have to select a proper backend before running the contacts routine. \n Valid options: 'serial', 'parallel'"
            )
        if self.runner.backend == 'serial':
            temp_instance = SerialContacts(self.query.AG.universe, self.query.AG, self.database.AG, cutoff)
            temp_instance.run(verbose=True)
        elif self.runner.backend == 'parallel':
            temp_instance = ParallelContacts(self.query.AG.universe, self.query.AG, self.database.AG, cutoff)
            temp_instance.run(n_jobs=self.runner.n_jobs)
        self.contacts = temp_instance.contacts


    def __str__(self):
        if not isinstance(self.contacts, np.ndarray):
            return "<prolintpy.Contacts containing 0 contacts>"
        else:
            return "<prolintpy.Contacts containing {} contacts>".format(len(self.contacts))

    def __repr__(self):
        if not isinstance(self.contacts, np.ndarray):
            return "<prolintpy.Contacts containing 0 contacts>"
        else:
            return "<prolintpy.Contacts containing {} contacts>".format(len(self.contacts))
