<?php
class Members extends Zend_Db_Table
{
    protected $_name = 'lu_members';
    protected $_rowClass = 'Member';
	
    public function fetchAllMembers()
    {
       return $this->fetchAll(null, 'id ASC', null);
    }            
            
}